import { Board, Position, Color, Stone } from './types';
import { getStone, getNeighbors, setStone, boardToString, isValidPosition } from './board';

// Find all stones in the same group (connected by color) using BFS
export function getGroup(board: Board, pos: Position): Position[] {
  const color = getStone(board, pos);
  if (!color) return [];

  const visited = new Set<string>();
  const group: Position[] = [];
  const queue: Position[] = [pos];

  while (queue.length > 0) {
    const current = queue.pop()!;
    const key = `${current.x},${current.y}`;
    if (visited.has(key)) continue;
    visited.add(key);

    if (getStone(board, current) !== color) continue;

    group.push(current);
    for (const neighbor of getNeighbors(current)) {
      const nKey = `${neighbor.x},${neighbor.y}`;
      if (!visited.has(nKey)) {
        queue.push(neighbor);
      }
    }
  }

  return group;
}

// Count liberties (empty adjacent intersections) of a group
export function getLiberties(board: Board, group: Position[]): Position[] {
  const liberties = new Set<string>();
  const result: Position[] = [];

  for (const pos of group) {
    for (const neighbor of getNeighbors(pos)) {
      const key = `${neighbor.x},${neighbor.y}`;
      if (!liberties.has(key) && getStone(board, neighbor) === null) {
        liberties.add(key);
        result.push(neighbor);
      }
    }
  }

  return result;
}

// Remove a group of stones from the board, returns the new board
export function removeGroup(board: Board, group: Position[]): Board {
  let newBoard = board;
  for (const pos of group) {
    newBoard = setStone(newBoard, pos, null);
  }
  return newBoard;
}

// Apply captures: remove opponent groups with 0 liberties after placing a stone
export function applyCapturesAfterPlace(
  board: Board,
  placedPos: Position,
  placedColor: Color
): { board: Board; capturedCount: number } {
  const opponentColor: Stone = placedColor === 'black' ? 'white' : 'black';
  let newBoard = board;
  let capturedCount = 0;
  const processed = new Set<string>();

  // Check all neighbors for opponent groups with no liberties
  for (const neighbor of getNeighbors(placedPos)) {
    const key = `${neighbor.x},${neighbor.y}`;
    if (processed.has(key)) continue;
    if (getStone(newBoard, neighbor) !== opponentColor) continue;

    const group = getGroup(newBoard, neighbor);
    for (const g of group) processed.add(`${g.x},${g.y}`);

    const liberties = getLiberties(newBoard, group);
    if (liberties.length === 0) {
      newBoard = removeGroup(newBoard, group);
      capturedCount += group.length;
    }
  }

  return { board: newBoard, capturedCount };
}

// Check if placing a stone would be suicide (no liberties and no captures)
export function isSuicide(board: Board, pos: Position, color: Color): boolean {
  // Place the stone temporarily
  const tempBoard = setStone(board, pos, color);

  // Check if it captures any opponent stones first
  const { capturedCount } = applyCapturesAfterPlace(tempBoard, pos, color);
  if (capturedCount > 0) return false;

  // Check if the placed stone's group has any liberties
  const group = getGroup(tempBoard, pos);
  const liberties = getLiberties(tempBoard, group);
  return liberties.length === 0;
}

// Check if a move would violate the ko rule (positional superko - simple ko)
export function isKo(
  board: Board,
  pos: Position,
  color: Color,
  previousBoardHash: string | null
): boolean {
  if (!previousBoardHash) return false;

  // Simulate the move
  const tempBoard = setStone(board, pos, color);
  const { board: afterCapture } = applyCapturesAfterPlace(tempBoard, pos, color);
  const newHash = boardToString(afterCapture);

  return newHash === previousBoardHash;
}

// Validate if a move is legal
export function isLegalMove(
  board: Board,
  pos: Position,
  color: Color,
  previousBoardHash: string | null
): { legal: boolean; reason?: string } {
  if (!isValidPosition(pos)) {
    return { legal: false, reason: 'Position out of bounds' };
  }

  if (getStone(board, pos) !== null) {
    return { legal: false, reason: 'Position already occupied' };
  }

  if (isSuicide(board, pos, color)) {
    return { legal: false, reason: 'Suicide move' };
  }

  if (isKo(board, pos, color, previousBoardHash)) {
    return { legal: false, reason: 'Ko violation' };
  }

  return { legal: true };
}

// Execute a stone placement: place stone, capture, return new board + capture count
export function executePlace(
  board: Board,
  pos: Position,
  color: Color
): { board: Board; capturedCount: number } {
  const withStone = setStone(board, pos, color);
  return applyCapturesAfterPlace(withStone, pos, color);
}
