'use client';

import { ScoringState } from '@/lib/go/types';

interface ScoringOverlayProps {
  scoring: ScoringState;
  komi: number;
  blackConfirmed: boolean;
  whiteConfirmed: boolean;
}

export default function ScoringOverlay({
  scoring,
  komi,
  blackConfirmed,
  whiteConfirmed,
}: ScoringOverlayProps) {
  const diff = scoring.score.black - scoring.score.white;
  const result =
    diff > 0
      ? `B+${diff}`
      : diff < 0
        ? `W+${Math.abs(diff)}`
        : 'Draw';

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
      <h3 className="text-sm font-bold text-stone-800 mb-2">Scoring</h3>
      <p className="text-xs text-stone-600 mb-3">
        Click dead stones to mark/unmark them. Both players must confirm.
      </p>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="text-center">
          <div className="text-xs text-stone-500">Black</div>
          <div className="text-xl font-bold text-stone-900">
            {scoring.score.black}
          </div>
          <div className="text-xs text-stone-500">
            Territory: {scoring.territory.black.length}
          </div>
          {blackConfirmed && (
            <div className="text-xs text-green-600 font-medium">Confirmed</div>
          )}
        </div>
        <div className="text-center">
          <div className="text-xs text-stone-500">White (+{komi} komi)</div>
          <div className="text-xl font-bold text-stone-900">
            {scoring.score.white}
          </div>
          <div className="text-xs text-stone-500">
            Territory: {scoring.territory.white.length}
          </div>
          {whiteConfirmed && (
            <div className="text-xs text-green-600 font-medium">Confirmed</div>
          )}
        </div>
      </div>
      <div className="text-center text-sm font-bold text-stone-800">
        {result}
      </div>
    </div>
  );
}
