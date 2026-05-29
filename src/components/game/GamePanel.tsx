'use client';

import { GameState, TimerState, Color, ScoringState, RoomStatus } from '@/lib/go/types';
import Timer from './Timer';
import GameControls from './GameControls';
import ScoringOverlay from './ScoringOverlay';
import TerritoryPanel from './TerritoryPanel';

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
        <TerritoryPanel
          moveCount={gameState.moveCount}
          territoryEstimate={territoryEstimate}
          katagoResult={katagoResult}
          isAnalyzing={isAnalyzing}
        />
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
