'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { GameState, Color, Position, ScoringState } from '@/lib/go/types';
import { stringToBoard } from '@/lib/go/board';
import { createInitialGameState } from '@/lib/go/engine';
import { RealtimeChannel } from '@supabase/supabase-js';

interface UndoRequest {
  id: string;
  requested_by: string;
  move_number: number;
  status: string;
}

function parseDeadStones(str: string): Position[] {
  if (!str) return [];
  return str
    .split(';')
    .filter(Boolean)
    .map(s => {
      const [x, y] = s.split(',').map(Number);
      return { x, y };
    })
    .filter(p => Number.isFinite(p.x) && Number.isFinite(p.y) && p.x >= 0 && p.y >= 0);
}

export function useSupabaseGame(roomId: string) {
  const [gameState, setGameState] = useState<GameState>(createInitialGameState());
  const [scoringState, setScoringState] = useState<ScoringState | null>(null);
  const [undoRequest, setUndoRequest] = useState<UndoRequest | null>(null);
  const [lastMove, setLastMove] = useState<Position | null>(null);
  const [scoringRequestedBy, setScoringRequestedBy] = useState<Color | null>(null);

  const fetchGameState = useCallback(async () => {
    const { data, error } = await supabase
      .from('game_states')
      .select('*')
      .eq('room_id', roomId)
      .single();

    if (error || !data) return;

    const board = stringToBoard(data.board);
    setGameState({
      board,
      currentPlayer: data.current_player as Color,
      moveCount: data.move_count,
      consecutivePasses: data.consecutive_passes,
      captures: { black: data.captures_black, white: data.captures_white },
      previousBoardHash: data.previous_board_hash,
      moves: [], // Moves history not needed from server for gameplay
      result: data.result,
    });
    setScoringRequestedBy((data.scoring_requested_by as Color) || null);

    // Fetch last move for marker
    if (data.move_count > 0) {
      const { data: lastMoveData } = await supabase
        .from('moves')
        .select('x, y')
        .eq('room_id', roomId)
        .order('move_number', { ascending: false })
        .limit(1)
        .single();

      if (lastMoveData && lastMoveData.x !== null && lastMoveData.y !== null) {
        setLastMove({ x: lastMoveData.x, y: lastMoveData.y });
      } else {
        setLastMove(null);
      }
    }
  }, [roomId]);

  const fetchScoringState = useCallback(async () => {
    const { data } = await supabase
      .from('scoring_states')
      .select('*')
      .eq('room_id', roomId)
      .single();

    if (data) {
      setScoringState({
        deadStones: parseDeadStones(data.dead_stones),
        territory: { black: [], white: [] }, // Recalculated client-side
        score: { black: 0, white: 0 },
        blackConfirmed: data.black_confirmed,
        whiteConfirmed: data.white_confirmed,
      });
    }
  }, [roomId]);

  const fetchUndoRequests = useCallback(async () => {
    const { data } = await supabase
      .from('undo_requests')
      .select('*')
      .eq('room_id', roomId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1);

    setUndoRequest(data && data.length > 0 ? data[0] : null);
  }, [roomId]);

  useEffect(() => {
    fetchGameState();
    fetchScoringState();
    fetchUndoRequests();

    const channels: RealtimeChannel[] = [];

    // Subscribe to game state changes
    const gameChannel = supabase
      .channel(`game:${roomId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'game_states', filter: `room_id=eq.${roomId}` },
        () => fetchGameState()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'scoring_states', filter: `room_id=eq.${roomId}` },
        () => fetchScoringState()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'undo_requests', filter: `room_id=eq.${roomId}` },
        () => fetchUndoRequests()
      )
      .subscribe();

    channels.push(gameChannel);

    return () => {
      channels.forEach(ch => ch.unsubscribe());
    };
  }, [roomId, fetchGameState, fetchScoringState, fetchUndoRequests]);

  return { gameState, scoringState, undoRequest, lastMove, scoringRequestedBy, refetch: fetchGameState };
}
