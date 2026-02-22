import { Board, Position, Color, ScoringState } from './types';
import { BOARD_SIZE } from './constants';
import { getStone, getNeighbors, isValidPosition } from './board';

// Chinese scoring: Territory = empty intersections surrounded by one color
// Final score = territory + living stones on board + komi (for white)

interface TerritoryResult {
  black: Position[];
  white: Position[];
  neutral: Position[]; // dame - borders both colors
}

// Flood-fill to find a connected empty region and which colors border it
function floodFillEmpty(
  board: Board,
  start: Position,
  visited: Set<string>
): { region: Position[]; borders: Set<Color> } {
  const region: Position[] = [];
  const borders = new Set<Color>();
  const queue: Position[] = [start];

  while (queue.length > 0) {
    const pos = queue.pop()!;
    const key = `${pos.x},${pos.y}`;

    if (visited.has(key)) continue;
    if (!isValidPosition(pos)) continue;

    const stone = getStone(board, pos);
    if (stone !== null) {
      borders.add(stone);
      continue;
    }

    visited.add(key);
    region.push(pos);

    for (const neighbor of getNeighbors(pos)) {
      const nKey = `${neighbor.x},${neighbor.y}`;
      if (!visited.has(nKey)) {
        queue.push(neighbor);
      }
    }
  }

  return { region, borders };
}

// Calculate territory for both colors
export function calculateTerritory(board: Board): TerritoryResult {
  const visited = new Set<string>();
  const result: TerritoryResult = { black: [], white: [], neutral: [] };

  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      const key = `${x},${y}`;
      if (visited.has(key)) continue;
      if (getStone(board, { x, y }) !== null) continue;

      const { region, borders } = floodFillEmpty(board, { x, y }, visited);

      if (borders.size === 1) {
        const owner = borders.values().next().value!;
        if (owner === 'black') {
          result.black.push(...region);
        } else {
          result.white.push(...region);
        }
      } else {
        result.neutral.push(...region);
      }
    }
  }

  return result;
}

// Remove dead stones from the board (mark them as captured)
export function removeDead(board: Board, deadStones: Position[]): Board {
  const newBoard = board.map(row => [...row]);
  for (const pos of deadStones) {
    newBoard[pos.y][pos.x] = null;
  }
  return newBoard;
}

// Count stones of each color on the board
export function countStones(board: Board): { black: number; white: number } {
  let black = 0;
  let white = 0;
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (board[y][x] === 'black') black++;
      else if (board[y][x] === 'white') white++;
    }
  }
  return { black, white };
}

// Calculate final score using Chinese rules
// Chinese scoring: Score = territory + living stones on board
export function calculateScore(
  board: Board,
  deadStones: Position[],
  komi: number
): { black: number; white: number; result: string } {
  const cleanBoard = removeDead(board, deadStones);
  const territory = calculateTerritory(cleanBoard);
  const stones = countStones(cleanBoard);

  const blackScore = territory.black.length + stones.black;
  const whiteScore = territory.white.length + stones.white + komi;

  const diff = blackScore - whiteScore;
  let result: string;
  if (diff > 0) {
    result = `B+${diff}`;
  } else if (diff < 0) {
    result = `W+${Math.abs(diff)}`;
  } else {
    result = 'Draw';
  }

  return { black: blackScore, white: whiteScore, result };
}

// Create initial scoring state
export function createScoringState(): ScoringState {
  return {
    deadStones: [],
    territory: { black: [], white: [] },
    score: { black: 0, white: 0 },
    blackConfirmed: false,
    whiteConfirmed: false,
  };
}

// Toggle a dead stone (add or remove from dead stones list)
export function toggleDeadStone(
  scoringState: ScoringState,
  pos: Position,
  board: Board,
  komi: number
): ScoringState {
  const existing = scoringState.deadStones.findIndex(
    p => p.x === pos.x && p.y === pos.y
  );

  let newDead: Position[];
  if (existing >= 0) {
    newDead = scoringState.deadStones.filter((_, i) => i !== existing);
  } else {
    // Only allow marking stones (not empty intersections) as dead
    if (getStone(board, pos) === null) return scoringState;
    newDead = [...scoringState.deadStones, pos];
  }

  // Recalculate territory and score
  const cleanBoard = removeDead(board, newDead);
  const territory = calculateTerritory(cleanBoard);
  const stones = countStones(cleanBoard);

  const blackScore = territory.black.length + stones.black;
  const whiteScore = territory.white.length + stones.white + komi;

  return {
    deadStones: newDead,
    territory: { black: territory.black, white: territory.white },
    score: { black: blackScore, white: whiteScore },
    blackConfirmed: false, // Reset confirmations on any change
    whiteConfirmed: false,
  };
}
