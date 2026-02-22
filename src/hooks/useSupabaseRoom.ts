'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { getRoom } from '@/lib/supabase/rooms';
import { RoomStatus } from '@/lib/go/types';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface RoomData {
  id: string;
  status: RoomStatus;
  komi: number;
  mainTimeSeconds: number;
  byoyomiSeconds: number;
  byoyomiPeriods: number;
  blackPlayer: { nickname: string; color: string } | null;
  whitePlayer: { nickname: string; color: string } | null;
}

export function useSupabaseRoom(roomId: string) {
  const [room, setRoom] = useState<RoomData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRoom = useCallback(async () => {
    try {
      const data = await getRoom(roomId);
      const players = data.players || [];
      const blackP = players.find((p: { color: string }) => p.color === 'black');
      const whiteP = players.find((p: { color: string }) => p.color === 'white');

      setRoom({
        id: data.id,
        status: data.status as RoomStatus,
        komi: data.komi,
        mainTimeSeconds: data.main_time_seconds,
        byoyomiSeconds: data.byoyomi_seconds,
        byoyomiPeriods: data.byoyomi_periods,
        blackPlayer: blackP ? { nickname: blackP.nickname, color: blackP.color } : null,
        whitePlayer: whiteP ? { nickname: whiteP.nickname, color: whiteP.color } : null,
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load room');
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    fetchRoom();

    // Subscribe to room changes
    const channels: RealtimeChannel[] = [];

    const roomChannel = supabase
      .channel(`room:${roomId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
        () => fetchRoom()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${roomId}` },
        () => fetchRoom()
      )
      .subscribe();

    channels.push(roomChannel);

    return () => {
      channels.forEach(ch => ch.unsubscribe());
    };
  }, [roomId, fetchRoom]);

  return { room, loading, error, refetch: fetchRoom };
}
