'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createRoom } from '@/lib/supabase/rooms';
import { RoomConfig } from '@/lib/go/types';
import { DEFAULT_KOMI, DEFAULT_TIMER } from '@/lib/go/constants';
import Button from '../ui/Button';

interface CreateRoomFormProps {
  nickname: string;
}

export default function CreateRoomForm({ nickname }: CreateRoomFormProps) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  const [boardSize, setBoardSize] = useState<9 | 13 | 19>(19);
  const [komi, setKomi] = useState(DEFAULT_KOMI);
  const [colorPref, setColorPref] = useState<'random' | 'black' | 'white'>('random');
  const [noTimer, setNoTimer] = useState(false);
  const [mainTime, setMainTime] = useState(DEFAULT_TIMER.mainTimeSeconds / 60); // in minutes
  const [byoyomiSec, setByoyomiSec] = useState(DEFAULT_TIMER.byoyomiSeconds);
  const [byoyomiPeriods, setByoyomiPeriods] = useState(DEFAULT_TIMER.byoyomiPeriods);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const config: RoomConfig = {
        boardSize,
        komi,
        colorPreference: colorPref,
        mainTimeSeconds: noTimer ? 0 : mainTime * 60,
        byoyomiSeconds: noTimer ? 0 : byoyomiSec,
        byoyomiPeriods: noTimer ? 0 : byoyomiPeriods,
      };

      const { roomId, myColor } = await createRoom(nickname, config);
      router.push(`/room/${roomId}?color=${myColor}&nickname=${encodeURIComponent(nickname)}`);
    } catch (e) {
      alert('방 만들기에 실패했습니다');
      console.error(e);
    } finally {
      setCreating(false);
    }
  };

  const boardSizeLabels: Record<number, string> = {
    9: '9x9 (입문)',
    13: '13x13 (중급)',
    19: '19x19 (정식)',
  };

  const colorLabels: Record<string, string> = {
    random: '랜덤',
    black: '흑',
    white: '백',
  };

  const toggleCls = (active: boolean) =>
    `flex-1 py-2 rounded-lg text-sm font-medium border transition-all duration-150 ${
      active
        ? 'bg-go-gold/15 text-go-gold border-go-gold/35'
        : 'bg-go-s0 text-go-t2 border-white/8 hover:bg-go-s2 hover:text-go-t1'
    }`;

  const SectionLabel = ({ text }: { text: string }) => (
    <span className="block text-[11px] font-semibold text-go-t3 uppercase tracking-wider mb-2">{text}</span>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* Board size */}
      <div>
        <SectionLabel text="바둑판 크기" />
        <div className="flex gap-2">
          {([9, 13, 19] as const).map(size => (
            <button key={size} type="button" onClick={() => setBoardSize(size)} className={toggleCls(boardSize === size)}>
              {boardSizeLabels[size]}
            </button>
          ))}
        </div>
      </div>

      {/* Komi */}
      <div>
        <SectionLabel text="덤 (코미)" />
        <select
          value={komi}
          onChange={e => setKomi(parseFloat(e.target.value))}
          className="go-select w-full px-3 py-2 text-sm"
        >
          <option value={0}>0 (핸디캡 대국)</option>
          <option value={0.5}>0.5</option>
          <option value={5.5}>5.5</option>
          <option value={6.5}>6.5 (표준)</option>
          <option value={7.5}>7.5</option>
        </select>
      </div>

      {/* Color preference */}
      <div>
        <SectionLabel text="색상 선택" />
        <div className="flex gap-2">
          {(['random', 'black', 'white'] as const).map(c => (
            <button key={c} type="button" onClick={() => setColorPref(c)} className={toggleCls(colorPref === c)}>
              {colorLabels[c]}
            </button>
          ))}
        </div>
      </div>

      {/* Timer toggle */}
      <div className="go-card p-3">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={noTimer}
            onChange={e => setNoTimer(e.target.checked)}
          />
          <span className="text-sm text-go-t2">타이머 없음 (무제한)</span>
        </label>
      </div>

      {/* Timer settings */}
      {!noTimer && (
        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <SectionLabel text="제한 시간" />
              <span className="text-go-gold text-sm font-mono">{mainTime}분</span>
            </div>
            <input type="range" min={1} max={60} value={mainTime}
              onChange={e => setMainTime(parseInt(e.target.value))} className="w-full" />
            <div className="flex justify-between text-[10px] text-go-t3 mt-1">
              <span>1분</span><span>60분</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex justify-between items-center mb-2">
                <SectionLabel text="초읽기" />
                <span className="text-go-gold text-xs font-mono">{byoyomiSec}초</span>
              </div>
              <input type="range" min={10} max={60} step={5} value={byoyomiSec}
                onChange={e => setByoyomiSec(parseInt(e.target.value))} className="w-full" />
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <SectionLabel text="횟수" />
                <span className="text-go-gold text-xs font-mono">{byoyomiPeriods}회</span>
              </div>
              <input type="range" min={1} max={10} value={byoyomiPeriods}
                onChange={e => setByoyomiPeriods(parseInt(e.target.value))} className="w-full" />
            </div>
          </div>
        </div>
      )}

      <Button type="submit" disabled={creating} className="w-full">
        {creating ? '방 만드는 중···' : '방 만들기'}
      </Button>
    </form>
  );
}
