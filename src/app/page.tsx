'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useNickname } from '@/hooks/useNickname';
import { supabase } from '@/lib/supabase/client';
import RoomList from '@/components/lobby/RoomList';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';

export default function LobbyPage() {
  const { nickname, setNickname, loaded } = useNickname();
  const [inputName, setInputName] = useState('');
  const [onlineCount, setOnlineCount] = useState<number | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!nickname) return;
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      if (cancelled) return;
      // RoomList가 'lobby' 채널(DB 변경 구독)을 이미 쓰고 있어서, supabase-js가
      // 토픽이 같으면 기존 채널을 재사용해 presence 설정이 무시되는 문제가 있었음.
      // 별도 토픽으로 분리해 충돌 방지.
      channel = supabase.channel('lobby-presence', {
        config: { presence: { key: nickname } },
      });

      const updateCount = () =>
        setOnlineCount(Object.keys(channel!.presenceState()).length);

      channel.on('presence', { event: 'sync' }, updateCount);
      channel.on('presence', { event: 'join' }, updateCount);
      channel.on('presence', { event: 'leave' }, updateCount);

      channel.subscribe(async (status) => {
        if (cancelled) return;

        if (status === 'SUBSCRIBED') {
          const result = await channel!.track({ nickname });
          if (result === 'ok') {
            // 서버 반영 대기 후 카운트
            setTimeout(updateCount, 500);
            setTimeout(updateCount, 1500);
          }
          return;
        }

        // 연결 실패(타임아웃, 채널 오류, 유휴 종료 등) → 재연결 시도
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          setOnlineCount(null);
          if (channel) supabase.removeChannel(channel);
          retryTimer = setTimeout(connect, 3000);
        }
      });
    };

    connect();

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      if (channel) supabase.removeChannel(channel);
    };
  }, [nickname]);

  if (!loaded) {
    return (
      <main className="min-h-screen bg-go-bg flex items-center justify-center">
        <Spinner size="lg" />
      </main>
    );
  }

  /* ── Nickname entry ──────────────────────────────── */
  if (!nickname) {
    return (
      <main className="min-h-screen bg-go-bg flex items-center justify-center p-4">
        <div className="w-full max-w-xs space-y-8 text-center">

          {/* Logo mark */}
          <div className="space-y-1">
            <div
              className="text-8xl font-bold text-go-gold leading-none select-none"
              style={{ fontFamily: 'serif', letterSpacing: '-0.04em' }}
            >
              碁
            </div>
            <h1 className="text-xl font-semibold text-go-t1 tracking-tight">온라인 바둑</h1>
            <p className="text-go-t3 text-sm">닉네임을 입력해 시작하세요</p>
          </div>

          <form
            onSubmit={e => { e.preventDefault(); if (inputName.trim()) setNickname(inputName.trim()); }}
            className="space-y-3"
          >
            <input
              type="text"
              value={inputName}
              onChange={e => setInputName(e.target.value)}
              placeholder="닉네임"
              maxLength={20}
              className="go-input w-full px-4 py-3 text-center text-base"
              autoFocus
            />
            <Button type="submit" disabled={!inputName.trim()} className="w-full py-3">
              입장
            </Button>
          </form>
        </div>
      </main>
    );
  }

  /* ── Lobby ───────────────────────────────────────── */
  return (
    <main className="min-h-screen bg-go-bg max-w-md mx-auto p-4 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between pt-2 pb-1">
        <div className="flex items-center gap-2">
          <span className="text-go-gold font-bold text-lg" style={{ fontFamily: 'serif' }}>碁</span>
          <h1 className="text-base font-semibold text-go-t1 tracking-tight">온라인 바둑</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-go-t2 bg-go-s1 px-2.5 py-1 rounded-full border border-white/7">
            {nickname}
          </span>
          <button
            onClick={() => setNickname('')}
            className="text-xs text-go-t3 hover:text-go-t2 transition-colors"
          >
            변경
          </button>
        </div>
      </div>

      {/* CTA */}
      <Button
        onClick={() => router.push(`/create?nickname=${encodeURIComponent(nickname)}`)}
        className="w-full py-3"
      >
        새 방 만들기
      </Button>

      {/* Room list */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[11px] font-semibold text-go-t3 uppercase tracking-wider">
            대기 중인 방
          </h2>
          <span className="flex items-center gap-1.5 text-[10px] text-go-t3">
            <span className={`w-1.5 h-1.5 rounded-full ${onlineCount !== null ? 'bg-go-green' : 'bg-go-t3 animate-pulse'}`} />
            {onlineCount !== null ? `${onlineCount}명 접속 중` : '연결 중...'}
          </span>
        </div>
        <RoomList nickname={nickname} />
      </div>
    </main>
  );
}
