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

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Board Size */}
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">바둑판 크기</label>
        <div className="flex gap-2">
          {([9, 13, 19] as const).map(size => (
            <button
              key={size}
              type="button"
              onClick={() => setBoardSize(size)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                boardSize === size
                  ? 'bg-stone-800 text-white border-stone-800'
                  : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-50'
              }`}
            >
              {boardSizeLabels[size]}
            </button>
          ))}
        </div>
      </div>

      {/* Komi */}
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">덤 (코미)</label>
        <select
          value={komi}
          onChange={e => setKomi(parseFloat(e.target.value))}
          className="w-full border border-stone-300 rounded-lg px-3 py-2 text-stone-900 bg-white"
        >
          <option value={0}>0 (핸디캡 대국)</option>
          <option value={0.5}>0.5</option>
          <option value={5.5}>5.5</option>
          <option value={6.5}>6.5 (표준)</option>
          <option value={7.5}>7.5</option>
        </select>
      </div>

      {/* Color */}
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">색상</label>
        <div className="flex gap-2">
          {(['random', 'black', 'white'] as const).map(c => (
            <button
              key={c}
              type="button"
              onClick={() => setColorPref(c)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                colorPref === c
                  ? 'bg-stone-800 text-white border-stone-800'
                  : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-50'
              }`}
            >
              {colorLabels[c]}
            </button>
          ))}
        </div>
      </div>

      {/* Timer toggle */}
      <div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={noTimer}
            onChange={e => setNoTimer(e.target.checked)}
            className="w-4 h-4 accent-stone-800"
          />
          <span className="text-sm font-medium text-stone-700">타이머 없음 (무제한)</span>
        </label>
      </div>

      {/* Timer settings (hidden when noTimer) */}
      {!noTimer && (
        <>
          {/* Main Time */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              제한 시간: {mainTime}분
            </label>
            <input
              type="range"
              min={1}
              max={60}
              value={mainTime}
              onChange={e => setMainTime(parseInt(e.target.value))}
              className="w-full accent-stone-800"
            />
            <div className="flex justify-between text-xs text-stone-400 mt-0.5">
              <span>1분</span><span>60분</span>
            </div>
          </div>

          {/* Byoyomi */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                초읽기: {byoyomiSec}초
              </label>
              <input
                type="range"
                min={10}
                max={60}
                step={5}
                value={byoyomiSec}
                onChange={e => setByoyomiSec(parseInt(e.target.value))}
                className="w-full accent-stone-800"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                횟수: {byoyomiPeriods}회
              </label>
              <input
                type="range"
                min={1}
                max={10}
                value={byoyomiPeriods}
                onChange={e => setByoyomiPeriods(parseInt(e.target.value))}
                className="w-full accent-stone-800"
              />
            </div>
          </div>
        </>
      )}

      <Button type="submit" disabled={creating} className="w-full">
        {creating ? '방 만드는 중...' : '방 만들기'}
      </Button>
    </form>
  );
}
