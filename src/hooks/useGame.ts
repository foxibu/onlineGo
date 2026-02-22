'use client';

import { useCallback, useEffect, useState } from 'react';
import { Color, Position, ScoringState } from '@/lib/go/types';
import { boardToString } from '@/lib/go/board';
import { isLegalMove, executePlace } from '@/lib/go/rules';
import { calculateTerritory, countStones, removeDead, toggleDeadStone } from '@/lib/go/scoring';
import { submitMove, requestUndo, respondToUndo, updateScoringState, finalizeGame } from '@/lib/supabase/game';
import { useSupabaseGame } from './useSupabaseGame';
import { useSupabaseRoom } from './useSupabaseRoom';
import { useTimer } from './useTimer';

interface UseGameOptions {
  roomId: string;
  myColor: Color | null;
  nickname: string;
}

export function useGame({ roomId, myColor }: UseGameOptions) {
  const { room, loading: roomLoading, error: roomError } = useSupabaseRoom(roomId);
  const { gameState, scoringState: serverScoringState, undoRequest, lastMove } = useSupabaseGame(roomId);

  const [localScoring, setLocalScoring] = useState<ScoringState | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'info' | 'error' | 'success' } | null>(null);

  const isMyTurn = myColor === gameState.currentPlayer;
  const isPlaying = room?.status === 'playing';
  const isScoring = room?.status === 'scoring';
  const isFinished = room?.status === 'finished';

  const komi = room?.komi ?? 6.5;

  // Timer
  const handleTimeout = useCallback(
    (color: Color) => {
      if (myColor && color === myColor) {
        // I timed out - resign
        submitMove(
          roomId,
          myColor,
          gameState.board,
          gameState.moveCount + 1,
          0,
          gameState.captures.black,
          gameState.captures.white,
          null,
          null,
          null,
          'resign'
        ).catch(console.error);
      }
    },
    [roomId, myColor, gameState]
  );

  const { blackTimer, whiteTimer, handleMoveMade } = useTimer({
    mainTimeSeconds: room?.mainTimeSeconds ?? 600,
    byoyomiSeconds: room?.byoyomiSeconds ?? 30,
    byoyomiPeriods: room?.byoyomiPeriods ?? 3,
    currentPlayer: gameState.currentPlayer,
    isPlaying,
    onTimeout: handleTimeout,
  });

  // Scoring state management
  useEffect(() => {
    if (isScoring && serverScoringState) {
      // Recalculate territory client-side
      const cleanBoard = removeDead(gameState.board, serverScoringState.deadStones);
      const territory = calculateTerritory(cleanBoard);
      const stones = countStones(cleanBoard);

      setLocalScoring({
        deadStones: serverScoringState.deadStones,
        territory: { black: territory.black, white: territory.white },
        score: {
          black: territory.black.length + stones.black,
          white: territory.white.length + stones.white + komi,
        },
        blackConfirmed: serverScoringState.blackConfirmed,
        whiteConfirmed: serverScoringState.whiteConfirmed,
      });
    }
  }, [isScoring, serverScoringState, gameState.board, komi]);

  // Check if both confirmed scoring
  useEffect(() => {
    if (localScoring?.blackConfirmed && localScoring?.whiteConfirmed) {
      const diff = localScoring.score.black - localScoring.score.white;
      let result: string;
      if (diff > 0) result = `B+${diff}`;
      else if (diff < 0) result = `W+${Math.abs(diff)}`;
      else result = 'Draw';

      finalizeGame(roomId, result).catch(console.error);
    }
  }, [localScoring, roomId]);

  // Place stone
  const handlePlace = useCallback(
    async (pos: Position) => {
      if (!myColor || !isMyTurn || isScoring || isFinished) return;

      const { legal, reason } = isLegalMove(
        gameState.board,
        pos,
        myColor,
        gameState.previousBoardHash
      );

      if (!legal) {
        setToast({ message: reason || 'Illegal move', type: 'error' });
        return;
      }

      const currentBoardHash = boardToString(gameState.board);
      const { board: newBoard, capturedCount } = executePlace(gameState.board, pos, myColor);

      const newCaptures = { ...gameState.captures };
      newCaptures[myColor] += capturedCount;

      try {
        await submitMove(
          roomId,
          myColor,
          newBoard,
          gameState.moveCount + 1,
          0,
          newCaptures.black,
          newCaptures.white,
          currentBoardHash,
          pos.x,
          pos.y,
          'place'
        );
        handleMoveMade(myColor);
      } catch {
        setToast({ message: 'Move failed - may not be your turn', type: 'error' });
      }
    },
    [roomId, myColor, isMyTurn, isScoring, isFinished, gameState, handleMoveMade]
  );

  // Pass
  const handlePass = useCallback(async () => {
    if (!myColor || !isMyTurn) return;

    try {
      await submitMove(
        roomId,
        myColor,
        gameState.board,
        gameState.moveCount + 1,
        gameState.consecutivePasses + 1,
        gameState.captures.black,
        gameState.captures.white,
        gameState.previousBoardHash,
        null,
        null,
        'pass'
      );
      handleMoveMade(myColor);
    } catch {
      setToast({ message: 'Pass failed', type: 'error' });
    }
  }, [roomId, myColor, isMyTurn, gameState, handleMoveMade]);

  // Resign
  const handleResign = useCallback(async () => {
    if (!myColor) return;

    try {
      await submitMove(
        roomId,
        myColor,
        gameState.board,
        gameState.moveCount + 1,
        0,
        gameState.captures.black,
        gameState.captures.white,
        null,
        null,
        null,
        'resign'
      );
    } catch {
      setToast({ message: 'Resign failed', type: 'error' });
    }
  }, [roomId, myColor, gameState]);

  // Undo request
  const handleUndo = useCallback(async () => {
    if (!myColor || gameState.moveCount === 0) return;

    try {
      await requestUndo(roomId, myColor, gameState.moveCount);
      setToast({ message: 'Undo requested', type: 'info' });
    } catch {
      setToast({ message: 'Undo request failed', type: 'error' });
    }
  }, [roomId, myColor, gameState.moveCount]);

  // Respond to undo
  const handleUndoResponse = useCallback(
    async (accept: boolean) => {
      if (!undoRequest) return;

      try {
        await respondToUndo(undoRequest.id, accept);
        if (accept) {
          // Server-side undo would be handled by a trigger or the requester
          // For now, we just accept and let the requester apply the undo
          setToast({ message: 'Undo accepted', type: 'success' });
        } else {
          setToast({ message: 'Undo rejected', type: 'info' });
        }
      } catch {
        setToast({ message: 'Response failed', type: 'error' });
      }
    },
    [undoRequest]
  );

  // Dead stone toggle (scoring mode)
  const handleDeadStoneToggle = useCallback(
    async (pos: Position) => {
      if (!isScoring || !localScoring) return;

      const newScoring = toggleDeadStone(localScoring, pos, gameState.board, komi);
      setLocalScoring(newScoring);

      try {
        await updateScoringState(roomId, newScoring.deadStones);
      } catch {
        setToast({ message: 'Failed to sync dead stones', type: 'error' });
      }
    },
    [roomId, isScoring, localScoring, gameState.board, komi]
  );

  // Confirm score
  const handleConfirmScore = useCallback(async () => {
    if (!myColor || !localScoring) return;

    try {
      await updateScoringState(roomId, localScoring.deadStones, myColor);
    } catch {
      setToast({ message: 'Confirm failed', type: 'error' });
    }
  }, [roomId, myColor, localScoring]);

  const clearToast = useCallback(() => setToast(null), []);

  return {
    room,
    gameState,
    isMyTurn,
    isPlaying,
    isScoring,
    isFinished,
    lastMove,
    blackTimer,
    whiteTimer,
    scoring: localScoring,
    undoRequest,
    toast,
    roomLoading,
    roomError,
    handlePlace,
    handlePass,
    handleResign,
    handleUndo,
    handleUndoResponse,
    handleDeadStoneToggle,
    handleConfirmScore,
    clearToast,
  };
}
