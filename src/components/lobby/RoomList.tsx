'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { listWaitingRooms } from '@/lib/supabase/rooms';
import { supabase } from '@/lib/supabase/client';
import Button from '../ui/Button';
import { formatRelativeTime } from '@/lib/utils/time';

interface RoomListProps {
  nickname: string;
}

interface RoomItem {
  id: string;
  created_by: string;
  komi: number;
  main_time_seconds: number;
  byoyomi_seconds: number;
  byoyomi_periods: number;
  board_size: number;
  created_at: string;
  players: { nickname: string; color: string }[];
}

export default function RoomList({ nickname }: RoomListProps) {
  const [rooms, setRooms] = useState<RoomItem[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchRooms = async () => {
    try {
      const data = await listWaitingRooms();
      setRooms(data as RoomItem[]);
    } catch (e) {
      console.error('Failed to fetch rooms:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();

    // Subscribe to room changes for live updates
    const channel = supabase
      .channel('lobby')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rooms' },
        () => fetchRooms()
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  const handleJoin = (roomId: string) => {
    router.push(`/room/${roomId}?action=join&nickname=${encodeURIComponent(nickname)}`);
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map(i => (
          <div key={i} className="go-card p-3 animate-pulse">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full bg-go-s3" />
              <div className="h-3 bg-go-s3 rounded w-32" />
            </div>
            <div className="h-2.5 bg-go-s2 rounded w-48" />
          </div>
        ))}
      </div>
    );
  }

  if (rooms.length === 0) {
    return (
      <div className="text-center py-12 space-y-2">
        <div
          className="text-5xl text-go-gold/50 select-none"
          style={{ fontFamily: 'serif' }}
        >
          碁
        </div>
        <p className="text-go-t3 text-sm">대기 중인 방이 없습니다</p>
        <p className="text-go-t3 text-xs">방을 만들어 대국을 시작하세요</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {rooms.map(room => {
        const creatorColor = room.players.find(p => p.nickname === room.created_by)?.color ?? 'black';

        return (
          <div
            key={room.id}
            className="go-card flex items-center justify-between p-3 hover:border-white/12 transition-all"
          >
            <div className="min-w-0 flex-1">
              {/* 방 제목 행 */}
              <div className="flex items-center gap-2 mb-1">
                <div
                  className={`w-3 h-3 rounded-full flex-shrink-0 ${
                    creatorColor === 'black'
                      ? 'bg-[#1a1a1a] border border-white/20'
                      : 'bg-[#f0ebe0] border border-white/40'
                  }`}
                />
                <span className="text-sm font-medium text-go-t1 truncate">
                  {room.created_by}
                  <span className="text-go-t3 font-normal">님의 방</span>
                </span>
              </div>

              {/* 메타 행 */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="bg-go-s2 text-go-t2 text-[10px] font-mono px-1.5 py-0.5 rounded">
                  {room.board_size || 19}로
                </span>
                <span className="text-[11px] text-go-t3 font-mono">
                  덤 {room.komi}
                </span>
                <span className="text-go-t3/40 text-[10px]">·</span>
                <span className="text-[11px] text-go-t3 font-mono">
                  {room.main_time_seconds === 0
                    ? '무제한'
                    : `${Math.floor(room.main_time_seconds / 60)}분+${room.byoyomi_seconds}초×${room.byoyomi_periods}`}
                </span>
                <span className="text-go-t3/40 text-[10px]">·</span>
                <span className="text-[11px] text-go-t3">
                  {formatRelativeTime(room.created_at)}
                </span>
              </div>
            </div>

            <Button size="sm" onClick={() => handleJoin(room.id)} className="ml-3 flex-shrink-0">
              입장
            </Button>
          </div>
        );
      })}
    </div>
  );
}
