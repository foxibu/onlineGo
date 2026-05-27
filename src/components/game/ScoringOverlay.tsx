'use client';

import { ScoringState } from '@/lib/go/types';

interface ScoringOverlayProps {
  scoring: ScoringState;
  komi: number;
  blackConfirmed: boolean;
  whiteConfirmed: boolean;
  myColor: string | null;
}

export default function ScoringOverlay({ scoring, komi, blackConfirmed, whiteConfirmed, myColor }: ScoringOverlayProps) {
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
  const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

  const myConfirmed = myColor === 'black' ? blackConfirmed : myColor === 'white' ? whiteConfirmed : false;
  const opponentConfirmed = myColor === 'black' ? whiteConfirmed : myColor === 'white' ? blackConfirmed : false;

  return (
    <div className="go-card p-3 space-y-3">

      {/* Step guide */}
      {!myConfirmed && (
        <div className="bg-go-s0 border border-go-gold/20 rounded-lg p-2.5 space-y-2">
          <p className="text-[11px] font-semibold text-go-gold uppercase tracking-wider">계가 방법</p>
          {[
            { n: 1, text: '죽은 돌을 눌러 X 표시', sub: '살릴 수 없는 돌 = 결국 잡힐 돌' },
            { n: 2, text: '아래 점수 확인', sub: '집 + 살아있는 돌 합산' },
            { n: 3, text: '계가 확인 버튼 클릭', sub: '양쪽 확인 시 종료' },
          ].map(({ n, text, sub }) => (
            <div key={n} className="flex gap-2 items-start">
              <span className="flex-shrink-0 w-4 h-4 rounded-full bg-go-gold/20 text-go-gold text-[9px] flex items-center justify-center font-bold mt-0.5">{n}</span>
              <span className="text-xs text-go-t2">
                <b className="text-go-t1 font-medium">{text}</b>
                <span className="block text-[10px] text-go-t3 mt-0.5">{sub}</span>
              </span>
            </div>
          ))}
          <p className="text-[10px] text-go-t3 border-t border-white/7 pt-2">
            {deadCount > 0
              ? `죽은 돌 ${deadCount}개 표시됨 · 다시 클릭하면 취소`
              : '죽은 돌이 없으면 바로 확인 버튼을 누르세요'}
          </p>
        </div>
      )}

      {/* Waiting banner */}
      {myConfirmed && !opponentConfirmed && (
        <div className="bg-go-green/10 border border-go-green/25 rounded-lg p-2.5 text-center">
          <p className="text-xs font-semibold text-go-green">✓ 확인 완료</p>
          <p className="text-[10px] text-go-t3 mt-0.5">상대방 확인을 기다리는 중...</p>
        </div>
      )}

      {/* Score bar */}
      <div>
        <div className="flex h-6 rounded-full overflow-hidden border border-white/10 text-xs font-bold font-mono">
          <div
            className="bg-[#1a1a1a] flex items-center justify-center text-go-t1 transition-all duration-500 min-w-0"
            style={{ width: `${blackPct}%` }}
          >
            {blackPct > 20 && fmt(blackScore)}
          </div>
          <div
            className="bg-go-t1 flex items-center justify-center text-go-bg transition-all duration-500 min-w-0"
            style={{ width: `${100 - blackPct}%` }}
          >
            {(100 - blackPct) > 20 && fmt(whiteScore)}
          </div>
        </div>
        <div className="flex justify-between text-[10px] text-go-t3 mt-1 px-1">
          <span>흑</span><span>백</span>
        </div>
      </div>

      {/* Score breakdown */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        {/* Black */}
        <div className={`rounded-lg p-2.5 space-y-1 ${winner === 'black' ? 'bg-go-s3 border border-go-gold/30' : 'bg-go-s0 border border-white/7'}`}>
          <div className="flex items-center gap-1.5 mb-1">
            <span className="w-3 h-3 rounded-full bg-[#1a1a1a] border border-white/20 flex-shrink-0" />
            <span className="font-semibold text-go-t1">흑</span>
            {blackConfirmed && <span className="ml-auto text-[10px] text-go-green font-semibold">✓</span>}
          </div>
          {[['집', blackTerritory], ['살아있는 돌', blackStones]].map(([label, val]) => (
            <div key={String(label)} className="flex justify-between text-go-t2">
              <span>{label}</span><span className="font-mono text-go-t1">{val}</span>
            </div>
          ))}
          <div className="border-t border-white/7 pt-1 flex justify-between font-semibold">
            <span className="text-go-t2">합계</span>
            <span className="text-go-t1 font-mono">{fmt(blackScore)}</span>
          </div>
        </div>

        {/* White */}
        <div className={`rounded-lg p-2.5 space-y-1 ${winner === 'white' ? 'bg-go-s3 border border-go-gold/30' : 'bg-go-s0 border border-white/7'}`}>
          <div className="flex items-center gap-1.5 mb-1">
            <span className="w-3 h-3 rounded-full bg-go-t1 border border-white/40 flex-shrink-0" />
            <span className="font-semibold text-go-t1">백</span>
            {whiteConfirmed && <span className="ml-auto text-[10px] text-go-green font-semibold">✓</span>}
          </div>
          {[['집', whiteTerritory], ['살아있는 돌', whiteStones], [`덤`, `+${komi}`]].map(([label, val]) => (
            <div key={String(label)} className="flex justify-between text-go-t2">
              <span>{label}</span><span className="font-mono text-go-t1">{val}</span>
            </div>
          ))}
          <div className="border-t border-white/7 pt-1 flex justify-between font-semibold">
            <span className="text-go-t2">합계</span>
            <span className="text-go-t1 font-mono">{fmt(whiteScore)}</span>
          </div>
        </div>
      </div>

      {/* Result */}
      <div className={`text-center py-2 rounded-lg text-sm font-semibold tracking-wide ${
        winner ? 'bg-go-gold/15 text-go-gold border border-go-gold/30' : 'bg-go-s2 text-go-t2'
      }`}>
        {diff > 0 ? `흑 ${fmt(diff)}집 승` : diff < 0 ? `백 ${fmt(Math.abs(diff))}집 승` : '무승부'}
      </div>
    </div>
  );
}
