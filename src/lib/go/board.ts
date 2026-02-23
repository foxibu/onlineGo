import { Board, Stone, Position, Color } from './types';

export function createEmptyBoard(size: number = 19): Board {
  return Array.from({ length: size }, () =>
    Array.from({ length: size }, () => null)
  );
}

export function cloneBoard(board: Board): Board {
  return board.map(row => [...row]);
}

export function getStone(board: Board, pos: Position): Stone {
  return board[pos.y]?.[pos.x] ?? null;
}

export function setStone(board: Board, pos: Position, stone: Stone): Board {
  const newBoard = cloneBoard(board);
  newBoard[pos.y][pos.x] = stone;
  return newBoard;
}

export function isValidPosition(pos: Position, size: number = 19): boolean {
  return pos.x >= 0 && pos.x < size && pos.y >= 0 && pos.y < size;
}

export function getNeighbors(pos: Position, size: number = 19): Position[] {
  const dirs = [
    { x: pos.x - 1, y: pos.y },
    { x: pos.x + 1, y: pos.y },
    { x: pos.x, y: pos.y - 1 },
    { x: pos.x, y: pos.y + 1 },
  ];
  return dirs.filter(p => isValidPosition(p, size));
}

export function oppositeColor(color: Color): Color {
  return color === 'black' ? 'white' : 'black';
}

// Serialize board to a string for hash comparison (ko detection)
export function boardToString(board: Board): string {
  return board.map(row =>
    row.map(s => (s === 'black' ? 'B' : s === 'white' ? 'W' : '.')).join('')
  ).join('');
}

// Deserialize string back to board (auto-detect size from string length)
export function stringToBoard(str: string): Board {
  const size = Math.round(Math.sqrt(str.length)); // 9→81, 13→169, 19→361
  const board: Board = [];
  for (let y = 0; y < size; y++) {
    const row: Stone[] = [];
    for (let x = 0; x < size; x++) {
      const ch = str[y * size + x];
      row.push(ch === 'B' ? 'black' : ch === 'W' ? 'white' : null);
    }
    board.push(row);
  }
  return board;
}
