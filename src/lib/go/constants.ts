export const BOARD_SIZE = 19;

// Star point positions for 19x19 board
export const STAR_POINTS: [number, number][] = [
  [3, 3], [3, 9], [3, 15],
  [9, 3], [9, 9], [9, 15],
  [15, 3], [15, 9], [15, 15],
];

export const DEFAULT_KOMI = 6.5;

export const DEFAULT_TIMER = {
  mainTimeSeconds: 600,    // 10 minutes
  byoyomiSeconds: 30,
  byoyomiPeriods: 3,
};
