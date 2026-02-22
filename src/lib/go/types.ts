export type Stone = 'black' | 'white' | null;
export type Color = 'black' | 'white';
export type Board = Stone[][];

export interface Position {
  x: number;
  y: number;
}

export interface Move {
  position: Position | null; // null = pass
  color: Color;
  moveNumber: number;
  type: 'place' | 'pass' | 'resign';
}

export interface Captures {
  black: number; // stones captured BY black
  white: number;
}

export interface GameState {
  board: Board;
  currentPlayer: Color;
  moveCount: number;
  consecutivePasses: number;
  captures: Captures;
  previousBoardHash: string | null;
  moves: Move[];
  result: string | null; // "B+3.5", "W+Resign", etc.
}

export interface ScoringState {
  deadStones: Position[];
  territory: { black: Position[]; white: Position[] };
  score: { black: number; white: number };
  blackConfirmed: boolean;
  whiteConfirmed: boolean;
}

export interface TimerState {
  mainTimeRemaining: number; // seconds
  byoyomiRemaining: number; // seconds
  byoyomiPeriodsLeft: number;
  isInByoyomi: boolean;
}

export interface RoomConfig {
  komi: number;
  colorPreference: 'black' | 'white' | 'random';
  mainTimeSeconds: number;
  byoyomiSeconds: number;
  byoyomiPeriods: number;
}

export type RoomStatus = 'waiting' | 'playing' | 'scoring' | 'finished';
