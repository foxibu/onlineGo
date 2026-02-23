import { GameState, Position, Color } from './types';
import { createEmptyBoard, boardToString, oppositeColor } from './board';
import { isLegalMove, executePlace } from './rules';

export function createInitialGameState(boardSize: number = 19): GameState {
  return {
    board: createEmptyBoard(boardSize),
    currentPlayer: 'black',
    moveCount: 0,
    consecutivePasses: 0,
    captures: { black: 0, white: 0 },
    previousBoardHash: null,
    moves: [],
    result: null,
  };
}

export type PlaceResult =
  | { success: true; state: GameState }
  | { success: false; reason: string };

export function placeStone(state: GameState, pos: Position): PlaceResult {
  if (state.result) {
    return { success: false, reason: 'Game is already finished' };
  }

  const { legal, reason } = isLegalMove(
    state.board,
    pos,
    state.currentPlayer,
    state.previousBoardHash
  );

  if (!legal) {
    return { success: false, reason: reason! };
  }

  const currentBoardHash = boardToString(state.board);
  const { board: newBoard, capturedCount } = executePlace(
    state.board,
    pos,
    state.currentPlayer
  );

  const newCaptures = { ...state.captures };
  newCaptures[state.currentPlayer] += capturedCount;

  const newState: GameState = {
    board: newBoard,
    currentPlayer: oppositeColor(state.currentPlayer),
    moveCount: state.moveCount + 1,
    consecutivePasses: 0,
    captures: newCaptures,
    previousBoardHash: currentBoardHash,
    moves: [
      ...state.moves,
      {
        position: pos,
        color: state.currentPlayer,
        moveNumber: state.moveCount + 1,
        type: 'place',
      },
    ],
    result: null,
  };

  return { success: true, state: newState };
}

export function pass(state: GameState): GameState {
  const newConsecutivePasses = state.consecutivePasses + 1;

  return {
    ...state,
    currentPlayer: oppositeColor(state.currentPlayer),
    moveCount: state.moveCount + 1,
    consecutivePasses: newConsecutivePasses,
    moves: [
      ...state.moves,
      {
        position: null,
        color: state.currentPlayer,
        moveNumber: state.moveCount + 1,
        type: 'pass',
      },
    ],
    // Two consecutive passes → game enters scoring (handled at UI level)
  };
}

export function resign(state: GameState, color: Color): GameState {
  const winner = oppositeColor(color);
  return {
    ...state,
    result: `${winner === 'black' ? 'B' : 'W'}+Resign`,
    moves: [
      ...state.moves,
      {
        position: null,
        color,
        moveNumber: state.moveCount + 1,
        type: 'resign',
      },
    ],
  };
}

export function undoLastMove(state: GameState): GameState | null {
  if (state.moves.length === 0) return null;

  // Replay all moves except the last one from initial state
  let replayState = createInitialGameState();
  const movesToReplay = state.moves.slice(0, -1);

  for (const move of movesToReplay) {
    if (move.type === 'place' && move.position) {
      const result = placeStone(replayState, move.position);
      if (!result.success) return null; // shouldn't happen
      replayState = result.state;
    } else if (move.type === 'pass') {
      replayState = pass(replayState);
    }
  }

  return replayState;
}
