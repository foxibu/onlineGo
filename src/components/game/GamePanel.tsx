'use client';

import { GameState, TimerState, Color, ScoringState, RoomStatus } from '@/lib/go/types';
import Timer from './Timer';
import GameControls from './GameControls';
import ScoringOverlay from './ScoringOverlay';

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
  onPass: () => void;
  onResign: () => void;
  onUndo: () => void;
  onConfirmScore: () => void;
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
  onPass,
  onResign,
  onUndo,
  onConfirmScore,
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

      {/* Move count */}
      <div className="text-center text-xs text-stone-500">
        Move {gameState.moveCount}
        {isMyTurn && !isScoring && !isFinished && (
          <span className="ml-2 text-amber-600 font-medium">Your turn</span>
        )}
        {isFinished && gameState.result && (
          <span className="ml-2 text-stone-800 font-bold">{gameState.result}</span>
        )}
      </div>

      {/* Scoring overlay */}
      {isScoring && scoring && (
        <ScoringOverlay
          scoring={scoring}
          komi={komi}
          blackConfirmed={scoring.blackConfirmed}
          whiteConfirmed={scoring.whiteConfirmed}
        />
      )}

      {/* Game controls */}
      <GameControls
        isMyTurn={isMyTurn}
        isScoring={isScoring}
        isFinished={isFinished}
        onPass={onPass}
        onResign={onResign}
        onUndo={onUndo}
        onConfirmScore={onConfirmScore}
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
