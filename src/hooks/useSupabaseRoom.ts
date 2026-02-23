'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { getRoom } from '@/lib/supabase/rooms';
import { RoomStatus } from '@/lib/go/types';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface PlayerTimerData {
  mainTimeRemaining: number;
  byoyomiRemaining: number;
  byoyomiPeriodsLeft: number;
}

export interface RoomData {
  id: string;
  status: RoomStatus;
  komi: number;
  mainTimeSeconds: number;
  byoyomiSeconds: number;
  byoyomiPeriods: number;
  boardSize: number;
  blackPlayer: { nickname: string; color: string } | null;
  whitePlayer: { nickname: string; color: string } | null;
  blackTimerData: PlayerTimerData | null;
  whiteTimerData: PlayerTimerData | null;
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
        boardSize: data.board_size || 19,
        blackPlayer: blackP ? { nickname: blackP.nickname, color: blackP.color } : null,
        whitePlayer: whiteP ? { nickname: whiteP.nickname, color: whiteP.color } : null,
        blackTimerData: blackP ? {
          mainTimeRemaining: blackP.main_time_remaining,
          byoyomiRemaining: blackP.byoyomi_remaining,
          byoyomiPeriodsLeft: blackP.byoyomi_periods_left,
        } : null,
        whiteTimerData: whiteP ? {
          mainTimeRemaining: whiteP.main_time_remaining,
          byoyomiRemaining: whiteP.byoyomi_remaining,
          byoyomiPeriodsLeft: whiteP.byoyomi_periods_left,
        } : null,
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

    // Polling fallback — Supabase Realtime can occasionally drop messages
    const pollInterval = setInterval(() => fetchRoom(), 3000);

    return () => {
      channels.forEach(ch => ch.unsubscribe());
      clearInterval(pollInterval);
    };
  }, [roomId, fetchRoom]);

  return { room, loading, error, refetch: fetchRoom };
}
