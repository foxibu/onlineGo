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
      <div className="text-center text-xs text-stone-500">
        {gameState.moveCount}수
        {isMyTurn && !isScoring && !isFinished && (
          <span className="ml-2 text-amber-600 font-medium">내 차례</span>
        )}
        {isFinished && gameState.result && (
          <span className="ml-2 text-stone-800 font-bold">{gameState.result}</span>
        )}
      </div>

      {/* Territory estimation panel */}
      {showTerritory && territoryEstimate && !isScoring && !isFinished && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2.5 text-xs">
          {/* Header */}
          <div className="flex items-center justify-between">
            <span className="font-bold text-stone-800">형세판단</span>
            <span className="text-stone-400 text-[10px]">중국식 · 집 + 살아있는 돌</span>
          </div>

          {/* Score rows */}
          {(() => {
            const blackLeads = territoryEstimate.blackTotal > territoryEstimate.whiteTotal;
            const whiteLeads = territoryEstimate.whiteTotal > territoryEstimate.blackTotal;
            return (
              <>
                {/* Black row */}
                <div className={`rounded-lg px-2.5 py-2 ${blackLeads ? 'bg-stone-800 text-white' : 'bg-white border border-stone-200 text-stone-700'}`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className={`inline-block w-3 h-3 rounded-full flex-shrink-0 ${blackLeads ? 'bg-white' : 'bg-stone-800'}`} />
                    <span className="font-semibold">흑</span>
                    {blackLeads && (
                      <span className="ml-auto text-[10px] text-amber-300 font-medium">우세</span>
                    )}
                  </div>
                  <div className={`flex gap-1 flex-wrap ${blackLeads ? 'text-stone-300' : 'text-stone-500'}`}>
                    <span>집 <b className={blackLeads ? 'text-white' : 'text-stone-800'}>{territoryEstimate.blackTerritory}</b></span>
                    <span>+</span>
                    <span>돌 <b className={blackLeads ? 'text-white' : 'text-stone-800'}>{territoryEstimate.blackStones}</b></span>
                    <span>=</span>
                    <span className={`font-bold text-sm ${blackLeads ? 'text-white' : 'text-stone-800'}`}>
                      {fmtScore(territoryEstimate.blackTotal)}점
                    </span>
                  </div>
                </div>

                {/* White row */}
                <div className={`rounded-lg px-2.5 py-2 ${whiteLeads ? 'bg-stone-800 text-white' : 'bg-white border border-stone-200 text-stone-700'}`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className={`inline-block w-3 h-3 rounded-full flex-shrink-0 border ${whiteLeads ? 'bg-stone-300 border-stone-400' : 'bg-white border-stone-400'}`} />
                    <span className="font-semibold">백</span>
                    {whiteLeads && (
                      <span className="ml-auto text-[10px] text-amber-300 font-medium">우세</span>
                    )}
                  </div>
                  <div className={`flex gap-1 flex-wrap ${whiteLeads ? 'text-stone-300' : 'text-stone-500'}`}>
                    <span>집 <b className={whiteLeads ? 'text-white' : 'text-stone-800'}>{territoryEstimate.whiteTerritory}</b></span>
                    <span>+</span>
                    <span>돌 <b className={whiteLeads ? 'text-white' : 'text-stone-800'}>{territoryEstimate.whiteStones}</b></span>
                    <span>+</span>
                    <span>덤 <b className={whiteLeads ? 'text-white' : 'text-stone-800'}>{territoryEstimate.komi}</b></span>
                    <span>=</span>
                    <span className={`font-bold text-sm ${whiteLeads ? 'text-white' : 'text-stone-800'}`}>
                      {fmtScore(territoryEstimate.whiteTotal)}점
                    </span>
                  </div>
                </div>

                {/* Comparison bar */}
                {(() => {
                  const total = territoryEstimate.blackTotal + territoryEstimate.whiteTotal;
                  const bPct = total > 0 ? (territoryEstimate.blackTotal / total) * 100 : 50;
                  const diff = territoryEstimate.blackTotal - territoryEstimate.whiteTotal;
                  return (
                    <div className="space-y-1">
                      <div className="flex h-2.5 rounded-full overflow-hidden border border-stone-200">
                        <div className="bg-stone-800 transition-all duration-500" style={{ width: `${bPct}%` }} />
                        <div className="bg-stone-200 transition-all duration-500" style={{ width: `${100 - bPct}%` }} />
                      </div>
                      <div className="flex justify-between text-[10px] text-stone-500">
                        <span>흑</span>
                        <span className="font-medium text-stone-700">
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

          {/* Neutral / dame */}
          <div className="flex items-center justify-between text-[10px] text-stone-400 border-t border-amber-200 pt-2">
            <span>미결 지역(다메): {territoryEstimate.neutralCount}칸</span>
            <span>· 판세는 {gameState.moveCount}수 기준</span>
          </div>

          {/* KataGo AI analysis section */}
          {isAnalyzing && (
            <div className="flex items-center gap-1.5 border-t border-amber-200 pt-2">
              <span className="text-[10px] text-stone-400 animate-pulse">AI 분석 중...</span>
            </div>
          )}
          {!isAnalyzing && katagoResult && (
            <div className="border-t border-amber-200 pt-2 space-y-1.5">
              <div className="flex items-center justify-between text-[10px] text-stone-500">
                <span className="font-semibold text-stone-700">AI 분석 (KataGo)</span>
                <span className="text-stone-400">
                  {katagoResult.scoreLead > 0
                    ? `흑 ${Math.abs(katagoResult.scoreLead).toFixed(1)}점 우세`
                    : katagoResult.scoreLead < 0
                    ? `백 ${Math.abs(katagoResult.scoreLead).toFixed(1)}점 우세`
                    : '균형'}
                </span>
              </div>
              {/* Winrate bar */}
              <div>
                <div className="flex h-3 rounded-full overflow-hidden border border-stone-200">
                  <div
                    className="bg-stone-800 transition-all duration-500"
                    style={{ width: `${(katagoResult.winrate * 100).toFixed(1)}%` }}
                  />
                  <div
                    className="bg-stone-200 transition-all duration-500"
                    style={{ width: `${(100 - katagoResult.winrate * 100).toFixed(1)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-stone-500 mt-0.5">
                  <span>흑 {(katagoResult.winrate * 100).toFixed(0)}%</span>
                  <span>백 {(100 - katagoResult.winrate * 100).toFixed(0)}%</span>
                </div>
              </div>
            </div>
          )}

          {/* Criteria note */}
          <p className="text-[10px] text-stone-400 leading-relaxed border-t border-amber-200 pt-2">
            ※ 현재 돌이 모두 살아있다고 가정합니다.<br />
            죽은 돌이 있으면 실제 결과와 다를 수 있습니다.
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
