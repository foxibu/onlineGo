'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Color, Position, ScoringState } from '@/lib/go/types';
import { boardToString } from '@/lib/go/board';
import { isLegalMove, executePlace } from '@/lib/go/rules';
import { calculateTerritory, countStones, removeDead, toggleDeadStone, suggestDeadStones } from '@/lib/go/scoring';
import { createInitialGameState, placeStone, pass } from '@/lib/go/engine';
import {
  submitMove, requestUndo, respondToUndo, updateScoringState,
  finalizeGame, requestScoring, acceptScoring, rejectScoring,
  fetchMoves, applyUndo, updatePlayerTimer,
} from '@/lib/supabase/game';
import { useSupabaseGame } from './useSupabaseGame';
import { useSupabaseRoom } from './useSupabaseRoom';
import { useTimer } from './useTimer';
import { notifyOpponent } from './usePushNotification';

interface UseGameOptions {
  roomId: string;
  myColor: Color | null;
  nickname: string;
}

export function useGame({ roomId, myColor }: UseGameOptions) {
  const { room, loading: roomLoading, error: roomError } = useSupabaseRoom(roomId);
  const { gameState, scoringState: serverScoringState, undoRequest, lastMove, scoringRequestedBy } = useSupabaseGame(roomId);

  const [localScoring, setLocalScoring] = useState<ScoringState | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'info' | 'error' | 'success' } | null>(null);
  const [showTerritory, setShowTerritory] = useState(false);
  // Prevent double-submission while a move is in-flight
  const [isSubmitting, setIsSubmitting] = useState(false);
  // KataGo analysis result
  const [katagoResult, setKatagoResult] = useState<{
    ownership: number[];  // -1 (white) to 1 (black), length = boardSize²
    scoreLead: number;    // positive = black leads (komi included)
    winrate: number;      // black's win probability 0–1
  } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  // Prevent double-finalization (both players' effects can trigger simultaneously)
  const finalizedRef = useRef(false);
  // Prevent running KataGo dead stone suggestion more than once per scoring session
  const scoringAnalyzedRef = useRef(false);

  const isMyTurn = myColor === gameState.currentPlayer;
  const isPlaying = room?.status === 'playing';
  const isScoring = room?.status === 'scoring';
  const isFinished = room?.status === 'finished';

  const komi = room?.komi ?? 6.5;

  // Reset flags when game restarts or room changes
  useEffect(() => {
    finalizedRef.current = false;
    scoringAnalyzedRef.current = false;
  }, [roomId]);

  // Reset scoring analysis flag when scoring phase ends
  useEffect(() => {
    if (!isScoring) scoringAnalyzedRef.current = false;
  }, [isScoring]);

  // Timer
  const handleTimeout = useCallback(
    (color: Color) => {
      if (myColor && color === myColor) {
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
    mainTimeSeconds: room?.mainTimeSeconds ?? 0,
    byoyomiSeconds: room?.byoyomiSeconds ?? 0,
    byoyomiPeriods: room?.byoyomiPeriods ?? 0,
    currentPlayer: gameState.currentPlayer,
    isPlaying,
    onTimeout: handleTimeout,
    savedBlack: room?.blackTimerData ?? null,
    savedWhite: room?.whiteTimerData ?? null,
  });

  // Refs to always hold the latest timer values (avoids stale closure in useCallback)
  const blackTimerRef = useRef(blackTimer);
  const whiteTimerRef = useRef(whiteTimer);
  useEffect(() => { blackTimerRef.current = blackTimer; }, [blackTimer]);
  useEffect(() => { whiteTimerRef.current = whiteTimer; }, [whiteTimer]);

  // Scoring state management
  useEffect(() => {
    if (isScoring && serverScoringState) {
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

  // Auto-suggest dead stones via KataGo when scoring starts (dead stone list still empty)
  useEffect(() => {
    if (!isScoring || !myColor) return;
    if (scoringAnalyzedRef.current) return;
    if (serverScoringState && serverScoringState.deadStones.length > 0) return;

    scoringAnalyzedRef.current = true;

    fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        board: boardToString(gameState.board),
        boardSize: gameState.board.length,
        komi,
        nextPlayer: gameState.currentPlayer,
      }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.error || !data.ownership) return;
        const suggested = suggestDeadStones(gameState.board, data.ownership);
        if (suggested.length === 0) return;
        // Only apply if dead stones are still empty (no manual changes yet)
        updateScoringState(roomId, suggested).catch(console.error);
        setToast({ message: `AI가 죽은 돌 ${suggested.length}개를 감지했습니다. 클릭으로 수정하세요.`, type: 'info' });
      })
      .catch(() => {}); // silently ignore — players can mark manually
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isScoring, myColor]);

  // Finalize game when both players confirm — only once per game
  useEffect(() => {
    if (!localScoring?.blackConfirmed || !localScoring?.whiteConfirmed) return;
    if (finalizedRef.current) return;
    finalizedRef.current = true;

    const diff = localScoring.score.black - localScoring.score.white;
    let result: string;
    if (diff > 0) result = `흑+${diff.toFixed(1).replace('.0', '')}`;
    else if (diff < 0) result = `백+${Math.abs(diff).toFixed(1).replace('.0', '')}`;
    else result = '무승부';

    finalizeGame(roomId, result).catch(console.error);
  }, [localScoring, roomId]);

  // Place stone
  const handlePlace = useCallback(
    async (pos: Position) => {
      if (!myColor || !isMyTurn || isScoring || isFinished || isSubmitting) return;

      const { legal, reason } = isLegalMove(
        gameState.board,
        pos,
        myColor,
        gameState.previousBoardHash
      );

      if (!legal) {
        setToast({ message: reason || '착수 불가', type: 'error' });
        return;
      }

      const currentBoardHash = boardToString(gameState.board);
      const { board: newBoard, capturedCount } = executePlace(gameState.board, pos, myColor);
      const newCaptures = { ...gameState.captures };
      newCaptures[myColor] += capturedCount;

      setIsSubmitting(true);
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
        // Save timer state to DB so it can be restored after page refresh
        const myTimer = myColor === 'black' ? blackTimerRef.current : whiteTimerRef.current;
        updatePlayerTimer(
          roomId, myColor,
          myTimer.mainTimeRemaining < 0 ? 0 : myTimer.mainTimeRemaining,
          myTimer.byoyomiRemaining,
          myTimer.byoyomiPeriodsLeft,
        ).catch(() => {});
        handleMoveMade(myColor);
        notifyOpponent(roomId, myColor, '온라인 바둑', '상대방이 착수했습니다. 내 차례입니다.');
      } catch {
        setToast({ message: '착수 실패 - 상대방 차례입니다', type: 'error' });
      } finally {
        setIsSubmitting(false);
      }
    },
    [roomId, myColor, isMyTurn, isScoring, isFinished, isSubmitting, gameState, handleMoveMade]
  );

  // Pass
  const handlePass = useCallback(async () => {
    if (!myColor || !isMyTurn || isSubmitting) return;

    setIsSubmitting(true);
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
      const myTimer = myColor === 'black' ? blackTimerRef.current : whiteTimerRef.current;
      updatePlayerTimer(
        roomId, myColor,
        myTimer.mainTimeRemaining < 0 ? 0 : myTimer.mainTimeRemaining,
        myTimer.byoyomiRemaining,
        myTimer.byoyomiPeriodsLeft,
      ).catch(() => {});
      handleMoveMade(myColor);
      notifyOpponent(roomId, myColor, '온라인 바둑', '상대방이 패스했습니다. 내 차례입니다.');
    } catch {
      setToast({ message: '패스 실패', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  }, [roomId, myColor, isMyTurn, isSubmitting, gameState, handleMoveMade]);

  // Resign
  const handleResign = useCallback(async () => {
    if (!myColor || isSubmitting) return;

    setIsSubmitting(true);
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
      setToast({ message: '기권 실패', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  }, [roomId, myColor, isSubmitting, gameState]);

  // Undo request
  const handleUndo = useCallback(async () => {
    if (!myColor || gameState.moveCount === 0 || isSubmitting) return;

    try {
      await requestUndo(roomId, myColor, gameState.moveCount);
      setToast({ message: '무르기 요청 전송됨', type: 'info' });
      notifyOpponent(roomId, myColor, '온라인 바둑', '상대방이 무르기를 요청했습니다.');
    } catch {
      setToast({ message: '무르기 요청 실패', type: 'error' });
    }
  }, [roomId, myColor, isSubmitting, gameState.moveCount]);

  // Respond to undo — if accepted, execute the board revert
  const handleUndoResponse = useCallback(
    async (accept: boolean) => {
      if (!undoRequest) return;

      try {
        await respondToUndo(undoRequest.id, accept);

        if (accept) {
          // Fetch all moves and replay up to (move_number - 1)
          const moves = await fetchMoves(roomId);
          const boardSize = gameState.board.length;
          let state = createInitialGameState(boardSize);

          for (const move of moves) {
            if (move.move_number >= undoRequest.move_number) break;
            if (move.move_type === 'place' && move.x !== null && move.y !== null) {
              const result = placeStone(state, { x: move.x, y: move.y });
              if (result.success) state = result.state;
            } else if (move.move_type === 'pass') {
              state = pass(state);
            }
          }

          await applyUndo(
            roomId,
            state.board,
            state.moveCount,
            state.currentPlayer,
            state.consecutivePasses,
            state.captures.black,
            state.captures.white,
            state.previousBoardHash
          );

          setToast({ message: '무르기 수락됨', type: 'success' });
        } else {
          setToast({ message: '무르기 거절됨', type: 'info' });
        }
      } catch {
        setToast({ message: '응답 실패', type: 'error' });
      }
    },
    [undoRequest, roomId, gameState.board.length]
  );

  // Dead stone toggle (scoring mode)
  const handleDeadStoneToggle = useCallback(
    async (pos: Position) => {
      if (!isScoring || !localScoring) return;

      const wasMarked = localScoring.deadStones.some(p => p.x === pos.x && p.y === pos.y);
      const newScoring = toggleDeadStone(localScoring, pos, gameState.board, komi);

      // toggleDeadStone returns the same object when clicking an empty intersection
      if (newScoring === localScoring) return;

      setLocalScoring(newScoring);
      setToast({
        message: wasMarked ? '죽은 돌 표시 취소 (다시 클릭하면 재표시)' : '죽은 돌 표시됨 — 다시 클릭하면 취소',
        type: 'info',
      });

      try {
        await updateScoringState(roomId, newScoring.deadStones);
      } catch {
        setToast({ message: '죽은 돌 동기화 실패', type: 'error' });
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
      setToast({ message: '계가 확인 실패', type: 'error' });
    }
  }, [roomId, myColor, localScoring]);

  const clearToast = useCallback(() => setToast(null), []);

  // Territory estimation toggle
  const handleToggleTerritory = useCallback(() => {
    setShowTerritory(prev => !prev);
  }, []);

  const estimatedTerritory = showTerritory ? calculateTerritory(gameState.board) : null;

  // Trigger KataGo analysis whenever territory view is active and board changes
  const boardStr = boardToString(gameState.board);
  useEffect(() => {
    if (!showTerritory) {
      setKatagoResult(null);
      return;
    }

    let cancelled = false;
    setIsAnalyzing(true);
    setKatagoResult(null);

    fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        board: boardStr,
        boardSize: gameState.board.length,
        komi,
        nextPlayer: gameState.currentPlayer,
      }),
    })
      .then(r => r.json())
      .then(data => {
        if (!cancelled && !data.error) setKatagoResult(data);
        if (!cancelled && data.error) console.warn('KataGo error:', data.error);
      })
      .catch(err => console.warn('KataGo fetch failed:', err))
      .finally(() => { if (!cancelled) setIsAnalyzing(false); });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showTerritory, boardStr, komi]);

  // Full Chinese scoring estimate: territory + living stones + komi
  // Assumes all current stones are alive (no dead stone removal)
  const territoryEstimate = estimatedTerritory
    ? (() => {
        const stones = countStones(gameState.board);
        return {
          blackTerritory: estimatedTerritory.black.length,
          whiteTerritory: estimatedTerritory.white.length,
          neutralCount: estimatedTerritory.neutral.length,
          blackStones: stones.black,
          whiteStones: stones.white,
          blackTotal: estimatedTerritory.black.length + stones.black,
          whiteTotal: estimatedTerritory.white.length + stones.white + komi,
          komi,
        };
      })()
    : null;

  // Scoring request handlers
  const handleRequestScoring = useCallback(async () => {
    if (!myColor) return;
    try {
      await requestScoring(roomId, myColor);
      setToast({ message: '계가 신청을 보냈습니다', type: 'info' });
      notifyOpponent(roomId, myColor, '온라인 바둑', '상대방이 계가를 신청했습니다.');
    } catch {
      setToast({ message: '계가 신청 실패', type: 'error' });
    }
  }, [roomId, myColor]);

  const handleAcceptScoring = useCallback(async () => {
    try {
      await acceptScoring(roomId);
    } catch {
      setToast({ message: '계가 수락 실패', type: 'error' });
    }
  }, [roomId]);

  const handleRejectScoring = useCallback(async () => {
    try {
      await rejectScoring(roomId);
      setToast({ message: '계가 신청을 거절했습니다', type: 'info' });
    } catch {
      setToast({ message: '계가 거절 실패', type: 'error' });
    }
  }, [roomId]);

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
    isSubmitting,
    handlePlace,
    handlePass,
    handleResign,
    handleUndo,
    handleUndoResponse,
    handleDeadStoneToggle,
    handleConfirmScore,
    clearToast,
    showTerritory,
    estimatedTerritory,
    territoryEstimate,
    katagoResult,
    isAnalyzing,
    handleToggleTerritory,
    scoringRequestedBy,
    handleRequestScoring,
    handleAcceptScoring,
    handleRejectScoring,
  };
}
