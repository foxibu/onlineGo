'use client';

import { GameState, TimerState, Color, ScoringState, RoomStatus } from '@/lib/go/types';
import Timer from './Timer';
import GameControls from './GameControls';
import ScoringOverlay from './ScoringOverlay';

interface TerritoryEstimate {
  blackTerritory: number;
  whiteTerritory: number;
  neutralCount: number;
  blackStones: number;
  whiteStones: number;
  blackTotal: number;
  whiteTotal: number;
  komi: number;
}

interface KatagoResult {
  ownership: number[];
  scoreLead: number;  // positive = black leads
  winrate: number;    // black's win probability
}

interface GamePanelProps {
  gameState: GameState;
  roomStatus: RoomStatus;
  myColor: Color | null;
  blackTimer: TimerState;
  whiteTimer: TimerState;
  blackName: string;
  whiteName: string;
  komi: number;
  scoring: ScoringState | null;
  undoPending: boolean;
  isSubmitting: boolean;
  showTerritory: boolean;
  territoryEstimate: TerritoryEstimate | null;
  katagoResult: KatagoResult | null;
  isAnalyzing: boolean;
  onPass: () => void;
  onResign: () => void;
  onUndo: () => void;
  onConfirmScore: () => void;
  onRequestScoring: () => void;
  onToggleTerritory: () => void;
  onCancelScoring: () => void;
}

export default function GamePanel({
  gameState,
  roomStatus,
  myColor,
  blackTimer,
  whiteTimer,
  blackName,
  whiteName,
  komi,
  scoring,
  undoPending,
  isSubmitting,
  showTerritory,
  territoryEstimate,
  katagoResult,
  isAnalyzing,
  onPass,
  onResign,
  onUndo,
  onConfirmScore,
  onRequestScoring,
  onToggleTerritory,
  onCancelScoring,
}: GamePanelProps) {
  const isMyTurn = myColor === gameState.currentPlayer;
  const isScoring = roomStatus === 'scoring';
  const isFinished = roomStatus === 'finished';

  // Show opponent timer on top, mine on bottom
  const topColor: Color = myColor === 'black' ? 'white' : 'black';
  const bottomColor: Color = myColor === 'black' ? 'black' : 'white';

  const fmtScore = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Opponent timer */}
      <Timer
        timer={topColor === 'black' ? blackTimer : whiteTimer}
        isActive={gameState.currentPlayer === topColor && !isScoring && !isFinished}
        playerName={topColor === 'black' ? blackName : whiteName}
        color={topColor}
        captures={gameState.captures[topColor]}
      />

      {/* Move count / turn indicator */}
      <div className="flex items-center justify-center gap-2 text-xs">
        <span className="text-go-t3 font-mono">{gameState.moveCount}수</span>
        {isMyTurn && !isScoring && !isFinished && (
          <span className="text-go-gold font-medium text-[11px] bg-go-gold/10 border border-go-gold/25 px-2 py-0.5 rounded-full">내 차례</span>
        )}
        {isFinished && gameState.result && (
          <span className="text-go-t1 font-semibold">{gameState.result}</span>
        )}
      </div>

      {/* Territory estimation panel */}
      {showTerritory && territoryEstimate && !isScoring && !isFinished && (
        <div className="go-card p-3 space-y-2.5 text-xs">
          {/* Header */}
          <div className="flex items-center justify-between">
            <span className="font-semibold text-go-t1 text-[11px] uppercase tracking-wider">형세판단</span>
            <span className="text-go-t3 text-[10px]">중국식 · 집 + 살아있는 돌</span>
          </div>

          {/* Score rows */}
          {(() => {
            const blackLeads = territoryEstimate.blackTotal > territoryEstimate.whiteTotal;
            const whiteLeads = territoryEstimate.whiteTotal > territoryEstimate.blackTotal;
            return (
              <>
                {/* Black */}
                <div className={`rounded-lg px-2.5 py-2 ${blackLeads ? 'bg-go-s3 border border-go-gold/30' : 'bg-go-s0 border border-white/7'}`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="w-3 h-3 rounded-full bg-[#1a1a1a] border border-white/20 flex-shrink-0" />
                    <span className="font-semibold text-go-t1">흑</span>
                    {blackLeads && <span className="ml-auto text-[10px] text-go-gold font-semibold">우세</span>}
                  </div>
                  <div className="flex gap-1 flex-wrap text-go-t2">
                    <span>집 <b className="text-go-t1">{territoryEstimate.blackTerritory}</b></span>
                    <span>+</span>
                    <span>돌 <b className="text-go-t1">{territoryEstimate.blackStones}</b></span>
                    <span>=</span>
                    <b className="text-go-t1 text-sm">{fmtScore(territoryEstimate.blackTotal)}점</b>
                  </div>
                </div>

                {/* White */}
                <div className={`rounded-lg px-2.5 py-2 ${whiteLeads ? 'bg-go-s3 border border-go-gold/30' : 'bg-go-s0 border border-white/7'}`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="w-3 h-3 rounded-full bg-go-t1 border border-white/40 flex-shrink-0" />
                    <span className="font-semibold text-go-t1">백</span>
                    {whiteLeads && <span className="ml-auto text-[10px] text-go-gold font-semibold">우세</span>}
                  </div>
                  <div className="flex gap-1 flex-wrap text-go-t2">
                    <span>집 <b className="text-go-t1">{territoryEstimate.whiteTerritory}</b></span>
                    <span>+</span>
                    <span>돌 <b className="text-go-t1">{territoryEstimate.whiteStones}</b></span>
                    <span>+</span>
                    <span>덤 <b className="text-go-t1">{territoryEstimate.komi}</b></span>
                    <span>=</span>
                    <b className="text-go-t1 text-sm">{fmtScore(territoryEstimate.whiteTotal)}점</b>
                  </div>
                </div>

                {/* Comparison bar */}
                {(() => {
                  const total = territoryEstimate.blackTotal + territoryEstimate.whiteTotal;
                  const bPct = total > 0 ? (territoryEstimate.blackTotal / total) * 100 : 50;
                  const diff = territoryEstimate.blackTotal - territoryEstimate.whiteTotal;
                  return (
                    <div className="space-y-1">
                      <div className="flex h-2 rounded-full overflow-hidden border border-white/10">
                        <div className="bg-[#1a1a1a] transition-all duration-500" style={{ width: `${bPct}%` }} />
                        <div className="bg-go-t1/70 transition-all duration-500" style={{ width: `${100 - bPct}%` }} />
                      </div>
                      <div className="flex justify-between text-[10px] text-go-t3">
                        <span>흑</span>
                        <span className="text-go-t2">
                          {Math.abs(diff) < 0.1 ? '균형' : diff > 0
                            ? `흑 ${fmtScore(diff)}점 우세`
                            : `백 ${fmtScore(Math.abs(diff))}점 우세`}
                        </span>
                        <span>백</span>
                      </div>
                    </div>
                  );
                })()}
              </>
            );
          })()}

          {/* Dame / neutral */}
          <div className="flex justify-between text-[10px] text-go-t3 border-t border-white/7 pt-2">
            <span>다메: {territoryEstimate.neutralCount}칸</span>
            <span>{gameState.moveCount}수 기준</span>
          </div>

          {/* KataGo */}
          {isAnalyzing && (
            <div className="border-t border-white/7 pt-2">
              <span className="text-[10px] text-go-t3 animate-pulse">AI 분석 중···</span>
            </div>
          )}
          {!isAnalyzing && katagoResult && (
            <div className="border-t border-white/7 pt-2 space-y-1.5">
              <div className="flex justify-between text-[10px]">
                <span className="font-semibold text-go-gold">AI (KataGo)</span>
                <span className="text-go-t2">
                  {katagoResult.scoreLead > 0
                    ? `흑 ${Math.abs(katagoResult.scoreLead).toFixed(1)}점 우세`
                    : katagoResult.scoreLead < 0
                    ? `백 ${Math.abs(katagoResult.scoreLead).toFixed(1)}점 우세`
                    : '균형'}
                </span>
              </div>
              <div className="flex h-2 rounded-full overflow-hidden border border-white/10">
                <div className="bg-[#1a1a1a] transition-all duration-500" style={{ width: `${(katagoResult.winrate * 100).toFixed(1)}%` }} />
                <div className="bg-go-t1/70 transition-all duration-500" style={{ width: `${(100 - katagoResult.winrate * 100).toFixed(1)}%` }} />
              </div>
              <div className="flex justify-between text-[10px] text-go-t3">
                <span>흑 {(katagoResult.winrate * 100).toFixed(0)}%</span>
                <span>백 {(100 - katagoResult.winrate * 100).toFixed(0)}%</span>
              </div>
            </div>
          )}

          <p className="text-[10px] text-go-t3 border-t border-white/7 pt-2">
            ※ 모든 돌이 살아있다고 가정합니다
          </p>
        </div>
      )}

      {/* Scoring overlay */}
      {isScoring && scoring && (
        <ScoringOverlay
          scoring={scoring}
          komi={komi}
          blackConfirmed={scoring.blackConfirmed}
          whiteConfirmed={scoring.whiteConfirmed}
          myColor={myColor}
        />
      )}

      {/* Game controls */}
      <GameControls
        isMyTurn={isMyTurn}
        isScoring={isScoring}
        isFinished={isFinished}
        isSubmitting={isSubmitting}
        myColor={myColor}
        showTerritory={showTerritory}
        myScoreConfirmed={
          isScoring && scoring
            ? myColor === 'black'
              ? scoring.blackConfirmed
              : scoring.whiteConfirmed
            : false
        }
        onPass={onPass}
        onResign={onResign}
        onUndo={onUndo}
        onConfirmScore={onConfirmScore}
        onRequestScoring={onRequestScoring}
        onToggleTerritory={onToggleTerritory}
        onCancelScoring={onCancelScoring}
        undoPending={undoPending}
      />

      {/* My timer */}
      <Timer
        timer={bottomColor === 'black' ? blackTimer : whiteTimer}
        isActive={gameState.currentPlayer === bottomColor && !isScoring && !isFinished}
        playerName={bottomColor === 'black' ? blackName : whiteName}
        color={bottomColor}
        captures={gameState.captures[bottomColor]}
      />
    </div>
  );
}
