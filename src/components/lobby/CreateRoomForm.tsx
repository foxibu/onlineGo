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

  const [komi, setKomi] = useState(DEFAULT_KOMI);
  const [colorPref, setColorPref] = useState<'random' | 'black' | 'white'>('random');
  const [mainTime, setMainTime] = useState(DEFAULT_TIMER.mainTimeSeconds / 60); // in minutes
  const [byoyomiSec, setByoyomiSec] = useState(DEFAULT_TIMER.byoyomiSeconds);
  const [byoyomiPeriods, setByoyomiPeriods] = useState(DEFAULT_TIMER.byoyomiPeriods);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const config: RoomConfig = {
        komi,
        colorPreference: colorPref,
        mainTimeSeconds: mainTime * 60,
        byoyomiSeconds: byoyomiSec,
        byoyomiPeriods,
      };

      const { roomId, myColor } = await createRoom(nickname, config);
      router.push(`/room/${roomId}?color=${myColor}&nickname=${encodeURIComponent(nickname)}`);
    } catch (e) {
      alert('Failed to create room');
      console.error(e);
    } finally {
      setCreating(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Komi */}
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">Komi</label>
        <select
          value={komi}
          onChange={e => setKomi(parseFloat(e.target.value))}
          className="w-full border border-stone-300 rounded-lg px-3 py-2 text-stone-900 bg-white"
        >
          <option value={0}>0</option>
          <option value={5.5}>5.5</option>
          <option value={6.5}>6.5</option>
          <option value={7.5}>7.5</option>
        </select>
      </div>

      {/* Color */}
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">Color</label>
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
              {c === 'random' ? 'Random' : c === 'black' ? 'Black' : 'White'}
            </button>
          ))}
        </div>
      </div>

      {/* Main Time */}
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">
          Main Time: {mainTime} min
        </label>
        <input
          type="range"
          min={1}
          max={60}
          value={mainTime}
          onChange={e => setMainTime(parseInt(e.target.value))}
          className="w-full accent-stone-800"
        />
      </div>

      {/* Byoyomi */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">
            Byoyomi: {byoyomiSec}s
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
            Periods: {byoyomiPeriods}
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

      <Button type="submit" disabled={creating} className="w-full">
        {creating ? 'Creating...' : 'Create Room'}
      </Button>
    </form>
  );
}
