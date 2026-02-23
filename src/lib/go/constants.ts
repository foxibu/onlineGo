export const BOARD_SIZE = 19;

export const BOARD_SIZES = [9, 13, 19] as const;
export type BoardSize = typeof BOARD_SIZES[number];

// Star point positions by board size
const STAR_POINTS_MAP: Record<number, [number, number][]> = {
  9: [
    [2, 2], [2, 6],
    [4, 4],
    [6, 2], [6, 6],
  ],
  13: [
    [3, 3], [3, 6], [3, 9],
    [6, 3], [6, 6], [6, 9],
    [9, 3], [9, 6], [9, 9],
  ],
  19: [
    [3, 3], [3, 9], [3, 15],
    [9, 3], [9, 9], [9, 15],
    [15, 3], [15, 9], [15, 15],
  ],
};

// Star point positions for 19x19 board (legacy export)
export const STAR_POINTS: [number, number][] = STAR_POINTS_MAP[19];

export function getStarPoints(boardSize: number): [number, number][] {
  return STAR_POINTS_MAP[boardSize] || [];
}

export const DEFAULT_KOMI = 6.5;

export const DEFAULT_TIMER = {
  mainTimeSeconds: 600,    // 10 minutes
  byoyomiSeconds: 30,
  byoyomiPeriods: 3,
};
