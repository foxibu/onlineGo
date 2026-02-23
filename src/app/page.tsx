'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useNickname } from '@/hooks/useNickname';
import RoomList from '@/components/lobby/RoomList';
import Button from '@/components/ui/Button';

export default function LobbyPage() {
  const { nickname, setNickname, loaded } = useNickname();
  const [inputName, setInputName] = useState('');
  const router = useRouter();

  if (!loaded) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-stone-500">불러오는 중...</div>
      </main>
    );
  }

  // Nickname entry screen
  if (!nickname) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          <h1 className="text-3xl font-bold text-stone-900">온라인 바둑</h1>
          <p className="text-stone-600">닉네임을 입력해 시작하세요</p>
          <form
            onSubmit={e => {
              e.preventDefault();
              if (inputName.trim()) setNickname(inputName.trim());
            }}
            className="space-y-3"
          >
            <input
              type="text"
              value={inputName}
              onChange={e => setInputName(e.target.value)}
              placeholder="닉네임"
              maxLength={20}
              className="w-full border border-stone-300 rounded-lg px-4 py-3 text-center text-lg text-stone-900 bg-white focus:outline-none focus:ring-2 focus:ring-stone-800"
              autoFocus
            />
            <Button type="submit" disabled={!inputName.trim()} className="w-full">
              입장
            </Button>
          </form>
        </div>
      </main>
    );
  }

  // Lobby
  return (
    <main className="min-h-screen max-w-lg mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-stone-900">온라인 바둑</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-stone-600">{nickname}</span>
          <button
            onClick={() => setNickname('')}
            className="text-xs text-stone-400 hover:text-stone-600"
          >
            변경
          </button>
        </div>
      </div>

      <Button
        onClick={() => router.push(`/create?nickname=${encodeURIComponent(nickname)}`)}
        className="w-full"
      >
        방 만들기
      </Button>

      <div>
        <h2 className="text-sm font-medium text-stone-500 mb-2">대기 중인 방</h2>
        <RoomList nickname={nickname} />
      </div>
    </main>
  );
}
