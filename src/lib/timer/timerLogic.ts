import { TimerState } from '../go/types';

export function createTimerState(
  mainTimeSeconds: number,
  byoyomiSeconds: number,
  byoyomiPeriods: number
): TimerState {
  // mainTimeSeconds = 0 means no time limit → use -1 as sentinel
  const noLimit = mainTimeSeconds === 0 && byoyomiPeriods === 0;
  return {
    mainTimeRemaining: noLimit ? -1 : mainTimeSeconds,
    byoyomiRemaining: byoyomiSeconds,
    byoyomiPeriodsLeft: byoyomiPeriods,
    isInByoyomi: false,
  };
}

// Check if timer is set to "no limit" (mainTimeRemaining = -1)
export function isNoTimeLimit(state: TimerState): boolean {
  return state.mainTimeRemaining === -1;
}

// Tick the timer by 1 second. Returns new state and whether time is expired.
export function tickTimer(state: TimerState, byoyomiSeconds: number): {
  state: TimerState;
  expired: boolean;
} {
  // No time limit - never expire
  if (isNoTimeLimit(state)) {
    return { state, expired: false };
  }
  if (state.isInByoyomi) {
    const remaining = state.byoyomiRemaining - 1;
    if (remaining <= 0) {
      const periodsLeft = state.byoyomiPeriodsLeft - 1;
      if (periodsLeft <= 0) {
        return { state: { ...state, byoyomiRemaining: 0, byoyomiPeriodsLeft: 0 }, expired: true };
      }
      // Used up one period, reset byoyomi clock
      return {
        state: { ...state, byoyomiRemaining: byoyomiSeconds, byoyomiPeriodsLeft: periodsLeft },
        expired: false,
      };
    }
    return { state: { ...state, byoyomiRemaining: remaining }, expired: false };
  }

  // Main time
  const remaining = state.mainTimeRemaining - 1;
  if (remaining <= 0) {
    // Switch to byoyomi
    if (state.byoyomiPeriodsLeft > 0) {
      return {
        state: {
          ...state,
          mainTimeRemaining: 0,
          isInByoyomi: true,
          byoyomiRemaining: byoyomiSeconds,
        },
        expired: false,
      };
    }
    // No byoyomi periods
    return { state: { ...state, mainTimeRemaining: 0 }, expired: true };
  }

  return { state: { ...state, mainTimeRemaining: remaining }, expired: false };
}

// After a player makes a move, reset their byoyomi clock if in byoyomi
export function onMoveMade(state: TimerState, byoyomiSeconds: number): TimerState {
  if (state.isInByoyomi) {
    return { ...state, byoyomiRemaining: byoyomiSeconds };
  }
  return state;
}

// Format time for display
export function formatTime(state: TimerState): string {
  if (isNoTimeLimit(state)) {
    return '∞';
  }
  if (state.isInByoyomi) {
    return `${state.byoyomiRemaining}초 (${state.byoyomiPeriodsLeft})`;
  }
  const mins = Math.floor(state.mainTimeRemaining / 60);
  const secs = state.mainTimeRemaining % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
