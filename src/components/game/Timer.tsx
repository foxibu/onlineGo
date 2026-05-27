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

export default function Timer({ timer, isActive, playerName, color, captures }: TimerProps) {
  const isLowTime = timer.isInByoyomi || timer.mainTimeRemaining < 60;

  return (
    <div
      className={`
        flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200
        ${isActive
          ? 'bg-go-s2 border border-go-gold/40 shadow-[0_0_0_1px_rgba(196,138,30,0.2)]'
          : 'bg-go-s1 border border-white/7'}
      `}
    >
      {/* Stone */}
      <div
        className={`
          w-4 h-4 rounded-full flex-shrink-0 transition-all
          ${color === 'black'
            ? 'bg-[#1a1a1a] border border-white/20'
            : 'bg-[#f0ebe0] border border-white/40'}
          ${isActive ? 'scale-110' : ''}
        `}
      />

      {/* Name + captures */}
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-medium truncate transition-colors ${isActive ? 'text-go-t1' : 'text-go-t2'}`}>
          {playerName}
        </div>
        {captures > 0 && (
          <div className="text-[10px] text-go-t3 tabular-nums">
            따낸 돌 {captures}
          </div>
        )}
      </div>

      {/* Time */}
      <div
        className={`
          font-mono font-bold tabular-nums text-lg tracking-tight transition-colors
          ${isActive && isLowTime ? 'text-[#c0392b]' : isActive ? 'text-go-gold' : 'text-go-t3'}
        `}
      >
        {formatTime(timer)}
      </div>
    </div>
  );
}
