'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { TimerState, Color } from '@/lib/go/types';
import { createTimerState, tickTimer, onMoveMade } from '@/lib/timer/timerLogic';

interface SavedTimerData {
  mainTimeRemaining: number;
  byoyomiRemaining: number;
  byoyomiPeriodsLeft: number;
}

interface UseTimerOptions {
  mainTimeSeconds: number;
  byoyomiSeconds: number;
  byoyomiPeriods: number;
  currentPlayer: Color;
  isPlaying: boolean;
  onTimeout: (color: Color) => void;
  // Saved timer state from DB (to restore after page refresh)
  savedBlack?: SavedTimerData | null;
  savedWhite?: SavedTimerData | null;
}

function timerFromSaved(saved: SavedTimerData, byoyomiSeconds: number): TimerState {
  return {
    mainTimeRemaining: saved.mainTimeRemaining,
    byoyomiRemaining: saved.byoyomiRemaining,
    byoyomiPeriodsLeft: saved.byoyomiPeriodsLeft,
    // Determine phase from state
    isInByoyomi: saved.mainTimeRemaining <= 0 && saved.byoyomiPeriodsLeft > 0,
  };
}

export function useTimer({
  mainTimeSeconds,
  byoyomiSeconds,
  byoyomiPeriods,
  currentPlayer,
  isPlaying,
  onTimeout,
  savedBlack,
  savedWhite,
}: UseTimerOptions) {
  const [blackTimer, setBlackTimer] = useState<TimerState>(() =>
    createTimerState(0, 0, 0)
  );
  const [whiteTimer, setWhiteTimer] = useState<TimerState>(() =>
    createTimerState(0, 0, 0)
  );

  const initializedRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Prevent onTimeout being called multiple times after expiry
  const expiredRef = useRef(false);

  // Initialize timers once real room data arrives
  useEffect(() => {
    const hasRealTimer = mainTimeSeconds > 0 || byoyomiPeriods > 0;
    if (initializedRef.current || !hasRealTimer) return;
    initializedRef.current = true;

    // If saved timer data exists and was decremented from full time, restore it
    const fullMainTime = mainTimeSeconds;
    const blackSavedIsValid =
      savedBlack &&
      savedBlack.mainTimeRemaining >= 0 &&
      savedBlack.mainTimeRemaining < fullMainTime;
    const whiteSavedIsValid =
      savedWhite &&
      savedWhite.mainTimeRemaining >= 0 &&
      savedWhite.mainTimeRemaining < fullMainTime;

    setBlackTimer(
      blackSavedIsValid
        ? timerFromSaved(savedBlack!, byoyomiSeconds)
        : createTimerState(mainTimeSeconds, byoyomiSeconds, byoyomiPeriods)
    );
    setWhiteTimer(
      whiteSavedIsValid
        ? timerFromSaved(savedWhite!, byoyomiSeconds)
        : createTimerState(mainTimeSeconds, byoyomiSeconds, byoyomiPeriods)
    );
  }, [mainTimeSeconds, byoyomiSeconds, byoyomiPeriods, savedBlack, savedWhite]);

  // Tick the active player's timer
  useEffect(() => {
    if (!isPlaying) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    // Reset expiry flag when player changes (new turn = new expiry window)
    expiredRef.current = false;

    intervalRef.current = setInterval(() => {
      const setter = currentPlayer === 'black' ? setBlackTimer : setWhiteTimer;
      setter(prev => {
        const { state, expired } = tickTimer(prev, byoyomiSeconds);
        if (expired && !expiredRef.current) {
          expiredRef.current = true;
          onTimeout(currentPlayer);
        }
        return state;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [currentPlayer, isPlaying, byoyomiSeconds, onTimeout]);

  // Reset byoyomi on move
  const handleMoveMade = useCallback(
    (color: Color) => {
      expiredRef.current = false;
      const setter = color === 'black' ? setBlackTimer : setWhiteTimer;
      setter(prev => onMoveMade(prev, byoyomiSeconds));
    },
    [byoyomiSeconds]
  );

  const syncTimers = useCallback(
    (black: TimerState, white: TimerState) => {
      setBlackTimer(black);
      setWhiteTimer(white);
    },
    []
  );

  return { blackTimer, whiteTimer, handleMoveMade, syncTimers };
}
