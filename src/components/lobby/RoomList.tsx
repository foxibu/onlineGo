'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { listWaitingRooms } from '@/lib/supabase/rooms';
import { supabase } from '@/lib/supabase/client';
import Button from '../ui/Button';

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

  const formatTime = (seconds: number) => {
    if (seconds === 0) return '무제한';
    const mins = Math.floor(seconds / 60);
    return `${mins}분`;
  };

  const handleJoin = (roomId: string) => {
    router.push(`/room/${roomId}?action=join&nickname=${encodeURIComponent(nickname)}`);
  };

  if (loading) {
    return (
      <div className="text-center text-go-t3 text-sm py-8 animate-pulse">
        방 목록 불러오는 중···
      </div>
    );
  }

  if (rooms.length === 0) {
    return (
      <div className="text-center py-10 space-y-1">
        <p className="text-go-t3 text-sm">대기 중인 방이 없습니다</p>
        <p className="text-go-t3 text-xs">방을 만들어 대국을 시작하세요</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {rooms.map(room => (
        <div
          key={room.id}
          className="go-card flex items-center justify-between p-3 hover:border-white/12 transition-all group"
        >
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-go-t1 truncate">
              {room.created_by}
              <span className="text-go-t3 font-normal">님의 방</span>
            </div>
            <div className="text-[11px] text-go-t3 mt-0.5 font-mono">
              {room.board_size || 19}로 · 덤 {room.komi}
              {' · '}
              {room.main_time_seconds === 0
                ? '무제한'
                : `${formatTime(room.main_time_seconds)} + ${room.byoyomi_seconds}초×${room.byoyomi_periods}회`}
            </div>
          </div>
          <Button size="sm" onClick={() => handleJoin(room.id)} className="ml-3 flex-shrink-0">
            입장
          </Button>
        </div>
      ))}
    </div>
  );
}
