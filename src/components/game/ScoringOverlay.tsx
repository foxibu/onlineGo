'use client';

import { ScoringState } from '@/lib/go/types';

interface ScoringOverlayProps {
  scoring: ScoringState;
  komi: number;
  blackConfirmed: boolean;
  whiteConfirmed: boolean;
  myColor: string | null;
}

export default function ScoringOverlay({
  scoring,
  komi,
  blackConfirmed,
  whiteConfirmed,
  myColor,
}: ScoringOverlayProps) {
  const blackScore = scoring.score.black;
  const whiteScore = scoring.score.white;
  const diff = blackScore - whiteScore;

  const blackTerritory = scoring.territory.black.length;
  const whiteTerritory = scoring.territory.white.length;
  const blackStones = blackScore - blackTerritory;
  const whiteStones = Math.round(whiteScore - whiteTerritory - komi);
  const deadCount = scoring.deadStones.length;

  const totalScore = blackScore + whiteScore;
  const blackPct = totalScore > 0 ? (blackScore / totalScore) * 100 : 50;

  const winner: 'black' | 'white' | null = diff > 0 ? 'black' : diff < 0 ? 'white' : null;
  const fmtScore = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

  const myConfirmed = myColor === 'black' ? blackConfirmed : myColor === 'white' ? whiteConfirmed : false;
  const opponentConfirmed = myColor === 'black' ? whiteConfirmed : myColor === 'white' ? blackConfirmed : false;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-3">

      {/* Step-by-step guide — shown until I confirm */}
      {!myConfirmed && (
        <div className="bg-white border border-amber-300 rounded-lg p-2.5 space-y-1.5">
          <p className="text-xs font-bold text-stone-700 mb-2">계가 방법</p>
          <div className="space-y-1.5 text-xs text-stone-600">
            <div className="flex gap-2">
              <span className="flex-shrink-0 w-4 h-4 rounded-full bg-amber-400 text-white text-[10px] flex items-center justify-center font-bold">1</span>
              <span>
                <b>죽은 돌</b>을 클릭해서 X 표시
                <span className="block text-[10px] text-stone-400 mt-0.5">
                  죽은 돌 = 살릴 수 없어서 결국 잡힐 돌 (양 눈 만들기 불가능)
                </span>
              </span>
            </div>
            <div className="flex gap-2">
              <span className="flex-shrink-0 w-4 h-4 rounded-full bg-amber-400 text-white text-[10px] flex items-center justify-center font-bold">2</span>
              <span>
                아래 집 계산 확인
                <span className="block text-[10px] text-stone-400 mt-0.5">
                  죽은 돌 제거 후 집(둘러싼 빈 칸) + 살아있는 돌 수 합산
                </span>
              </span>
            </div>
            <div className="flex gap-2">
              <span className="flex-shrink-0 w-4 h-4 rounded-full bg-amber-400 text-white text-[10px] flex items-center justify-center font-bold">3</span>
              <span>
                <b>계가 확인</b> 버튼 클릭 → 상대방도 확인하면 종료
              </span>
            </div>
          </div>
          {deadCount > 0 && (
            <p className="text-[10px] text-amber-700 mt-2 pt-2 border-t border-amber-200">
              현재 죽은 돌 {deadCount}개 표시됨 · 다시 클릭하면 취소
            </p>
          )}
          {deadCount === 0 && (
            <p className="text-[10px] text-stone-400 mt-2 pt-2 border-t border-amber-200">
              죽은 돌이 없으면 바로 확인 버튼을 누르세요
            </p>
          )}
        </div>
      )}

      {/* Waiting for opponent after I confirmed */}
      {myConfirmed && !opponentConfirmed && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-2.5 text-center">
          <p className="text-xs font-medium text-green-700">✓ 확인 완료</p>
          <p className="text-[10px] text-green-600 mt-0.5">상대방 확인을 기다리는 중...</p>
        </div>
      )}

      {/* Score comparison bar */}
      <div>
        <div className="flex h-7 rounded-full overflow-hidden border border-stone-300 text-xs font-bold">
          <div
            className="bg-stone-800 flex items-center justify-center text-white transition-all duration-500 min-w-0"
            style={{ width: `${blackPct}%` }}
          >
            {blackPct > 18 && fmtScore(blackScore)}
          </div>
          <div
            className="bg-stone-100 flex items-center justify-center text-stone-700 transition-all duration-500 min-w-0"
            style={{ width: `${100 - blackPct}%` }}
          >
            {(100 - blackPct) > 18 && fmtScore(whiteScore)}
          </div>
        </div>
        <div className="flex justify-between text-xs text-stone-500 mt-0.5 px-1">
          <span>흑</span>
          <span>백</span>
        </div>
      </div>

      {/* Score breakdown */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        {/* Black */}
        <div className={`rounded-lg p-2.5 space-y-1 ${winner === 'black' ? 'bg-stone-800 text-white' : 'bg-white border border-stone-200'}`}>
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="inline-block w-3.5 h-3.5 rounded-full bg-stone-900 border border-stone-600 flex-shrink-0" />
            <span className="font-semibold">흑</span>
            {blackConfirmed && (
              <span className={`ml-auto text-[10px] font-bold ${winner === 'black' ? 'text-green-300' : 'text-green-600'}`}>✓ 확인</span>
            )}
          </div>
          <div className="flex justify-between">
            <span className="opacity-60">집</span>
            <span className="font-mono">{blackTerritory}</span>
          </div>
          <div className="flex justify-between">
            <span className="opacity-60">살아있는 돌</span>
            <span className="font-mono">{blackStones}</span>
          </div>
          <div className={`border-t pt-1 mt-1 flex justify-between font-bold ${winner === 'black' ? 'border-stone-600' : 'border-stone-200'}`}>
            <span>합계</span>
            <span className="text-base">{fmtScore(blackScore)}</span>
          </div>
        </div>

        {/* White */}
        <div className={`rounded-lg p-2.5 space-y-1 ${winner === 'white' ? 'bg-stone-800 text-white' : 'bg-white border border-stone-200'}`}>
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="inline-block w-3.5 h-3.5 rounded-full bg-white border-2 border-stone-400 flex-shrink-0" />
            <span className="font-semibold">백</span>
            {whiteConfirmed && (
              <span className={`ml-auto text-[10px] font-bold ${winner === 'white' ? 'text-green-300' : 'text-green-600'}`}>✓ 확인</span>
            )}
          </div>
          <div className="flex justify-between">
            <span className="opacity-60">집</span>
            <span className="font-mono">{whiteTerritory}</span>
          </div>
          <div className="flex justify-between">
            <span className="opacity-60">살아있는 돌</span>
            <span className="font-mono">{whiteStones}</span>
          </div>
          <div className="flex justify-between">
            <span className="opacity-60">덤</span>
            <span className="font-mono">+{komi}</span>
          </div>
          <div className={`border-t pt-1 mt-1 flex justify-between font-bold ${winner === 'white' ? 'border-stone-600' : 'border-stone-200'}`}>
            <span>합계</span>
            <span className="text-base">{fmtScore(whiteScore)}</span>
          </div>
        </div>
      </div>

      {/* Result banner */}
      <div className={`text-center py-1.5 rounded-lg text-sm font-bold ${
        winner ? 'bg-stone-800 text-white' : 'bg-stone-200 text-stone-600'
      }`}>
        {diff > 0
          ? `흑 ${fmtScore(diff)}집 승`
          : diff < 0
            ? `백 ${fmtScore(Math.abs(diff))}집 승`
            : '무승부'}
      </div>
    </div>
  );
}
