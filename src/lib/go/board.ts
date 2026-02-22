import { Board, Stone, Position, Color } from './types';
import { BOARD_SIZE } from './constants';

export function createEmptyBoard(): Board {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => null)
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

export function isValidPosition(pos: Position): boolean {
  return pos.x >= 0 && pos.x < BOARD_SIZE && pos.y >= 0 && pos.y < BOARD_SIZE;
}

export function getNeighbors(pos: Position): Position[] {
  const dirs = [
    { x: pos.x - 1, y: pos.y },
    { x: pos.x + 1, y: pos.y },
    { x: pos.x, y: pos.y - 1 },
    { x: pos.x, y: pos.y + 1 },
  ];
  return dirs.filter(isValidPosition);
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

// Deserialize string back to board
export function stringToBoard(str: string): Board {
  const board: Board = [];
  for (let y = 0; y < BOARD_SIZE; y++) {
    const row: Stone[] = [];
    for (let x = 0; x < BOARD_SIZE; x++) {
      const ch = str[y * BOARD_SIZE + x];
      row.push(ch === 'B' ? 'black' : ch === 'W' ? 'white' : null);
    }
    board.push(row);
  }
  return board;
}
