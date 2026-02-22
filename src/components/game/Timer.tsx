'use client';

import { TimerState } from '@/lib/go/types';
import { formatTime } from '@/lib/timer/timerLogic';

interface TimerProps {
  timer: TimerState;
  isActive: boolean;
  playerName: string;
  color: 'black' | 'white';
  captures: number;
}

export default function Timer({
  timer,
  isActive,
  playerName,
  color,
  captures,
}: TimerProps) {
  const isLowTime = timer.isInByoyomi || timer.mainTimeRemaining < 60;

  return (
    <div
      className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
        isActive ? 'bg-amber-100 ring-2 ring-amber-400' : 'bg-stone-100'
      }`}
    >
      <div
        className={`w-5 h-5 rounded-full border-2 ${
          color === 'black'
            ? 'bg-stone-900 border-stone-700'
            : 'bg-white border-stone-400'
        }`}
      />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-stone-900 truncate">
          {playerName}
        </div>
        <div className="text-xs text-stone-500">
          Captures: {captures}
        </div>
      </div>
      <div
        className={`text-lg font-mono font-bold tabular-nums ${
          isActive && isLowTime ? 'text-red-600' : 'text-stone-800'
        }`}
      >
        {formatTime(timer)}
      </div>
    </div>
  );
}
