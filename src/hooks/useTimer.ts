'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { TimerState, Color } from '@/lib/go/types';
import { createTimerState, tickTimer, onMoveMade } from '@/lib/timer/timerLogic';

interface UseTimerOptions {
  mainTimeSeconds: number;
  byoyomiSeconds: number;
  byoyomiPeriods: number;
  currentPlayer: Color;
  isPlaying: boolean;
  onTimeout: (color: Color) => void;
}

export function useTimer({
  mainTimeSeconds,
  byoyomiSeconds,
  byoyomiPeriods,
  currentPlayer,
  isPlaying,
  onTimeout,
}: UseTimerOptions) {
  const [blackTimer, setBlackTimer] = useState<TimerState>(() =>
    createTimerState(mainTimeSeconds, byoyomiSeconds, byoyomiPeriods)
  );
  const [whiteTimer, setWhiteTimer] = useState<TimerState>(() =>
    createTimerState(mainTimeSeconds, byoyomiSeconds, byoyomiPeriods)
  );

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Tick the active player's timer
  useEffect(() => {
    if (!isPlaying) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      const setter = currentPlayer === 'black' ? setBlackTimer : setWhiteTimer;
      setter(prev => {
        const { state, expired } = tickTimer(prev, byoyomiSeconds);
        if (expired) {
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
      const setter = color === 'black' ? setBlackTimer : setWhiteTimer;
      setter(prev => onMoveMade(prev, byoyomiSeconds));
    },
    [byoyomiSeconds]
  );

  // Sync timers from server data
  const syncTimers = useCallback(
    (black: TimerState, white: TimerState) => {
      setBlackTimer(black);
      setWhiteTimer(white);
    },
    []
  );

  return { blackTimer, whiteTimer, handleMoveMade, syncTimers };
}
