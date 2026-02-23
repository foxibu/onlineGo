import { supabase } from './client';
import { Board, Color, Position } from '../go/types';
import { boardToString } from '../go/board';

export interface GameStateRow {
  id: string;
  room_id: string;
  current_player: string;
  board: string;
  move_count: number;
  consecutive_passes: number;
  captures_black: number;
  captures_white: number;
  last_move_at: string | null;
  previous_board_hash: string | null;
  result: string | null;
  updated_at: string;
}

// Attempt to place a stone (atomic operation with optimistic locking)
export async function submitMove(
  roomId: string,
  myColor: Color,
  newBoard: Board,
  moveCount: number,
  consecutivePasses: number,
  capturesBlack: number,
  capturesWhite: number,
  previousBoardHash: string | null,
  moveX: number | null,
  moveY: number | null,
  moveType: 'place' | 'pass' | 'resign'
) {
  const nextPlayer = myColor === 'black' ? 'white' : 'black';

  const updatePayload = {
    board: boardToString(newBoard),
    current_player: nextPlayer,
    move_count: moveCount,
    consecutive_passes: consecutivePasses,
    captures_black: capturesBlack,
    captures_white: capturesWhite,
    previous_board_hash: previousBoardHash,
    last_move_at: new Date().toISOString(),
    result: moveType === 'resign'
      ? `${myColor === 'black' ? '백' : '흑'}+기권`
      : null,
    updated_at: new Date().toISOString(),
  };

  // Resign is allowed regardless of whose turn it is, but only if game isn't already over.
  // All other moves require it to be your turn (optimistic lock).
  const baseQuery = supabase.from('game_states').update(updatePayload).eq('room_id', roomId);
  const query = moveType === 'resign'
    ? baseQuery.is('result', null)
    : baseQuery.eq('current_player', myColor);

  const { data, error } = await query.select();

  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('Not your turn or move conflict');
  }

  // Record the move
  await supabase.from('moves').insert({
    room_id: roomId,
    move_number: moveCount,
    x: moveX,
    y: moveY,
    color: myColor,
    move_type: moveType,
  });

  // If two consecutive passes, update room to scoring
  if (consecutivePasses >= 2) {
    await supabase
      .from('rooms')
      .update({ status: 'scoring' })
      .eq('id', roomId);

    // Create scoring state
    await supabase.from('scoring_states').upsert({
      room_id: roomId,
      dead_stones: '',
      black_confirmed: false,
      white_confirmed: false,
    });
  }

  // If resign, update room to finished
  if (moveType === 'resign') {
    await supabase
      .from('rooms')
      .update({ status: 'finished' })
      .eq('id', roomId);
  }

  return data[0];
}

// Update timer for a player
export async function updatePlayerTimer(
  roomId: string,
  color: Color,
  mainTimeRemaining: number,
  byoyomiRemaining: number,
  byoyomiPeriodsLeft: number
) {
  await supabase
    .from('players')
    .update({
      main_time_remaining: mainTimeRemaining,
      byoyomi_remaining: byoyomiRemaining,
      byoyomi_periods_left: byoyomiPeriodsLeft,
    })
    .eq('room_id', roomId)
    .eq('color', color);
}

// Request undo
export async function requestUndo(roomId: string, requestedBy: Color, moveNumber: number) {
  const { error } = await supabase.from('undo_requests').insert({
    room_id: roomId,
    requested_by: requestedBy,
    move_number: moveNumber,
    status: 'pending',
  });
  if (error) throw error;
}

// Respond to undo request
export async function respondToUndo(undoRequestId: string, accept: boolean) {
  await supabase
    .from('undo_requests')
    .update({ status: accept ? 'accepted' : 'rejected' })
    .eq('id', undoRequestId);
}

// Update scoring state
export async function updateScoringState(
  roomId: string,
  deadStones: Position[],
  confirmedBy?: Color
) {
  const deadStr = deadStones.map(p => `${p.x},${p.y}`).join(';');

  const update: Record<string, unknown> = { dead_stones: deadStr };
  if (confirmedBy === 'black') update.black_confirmed = true;
  if (confirmedBy === 'white') update.white_confirmed = true;

  // Reset confirmations if dead stones changed (no confirmedBy)
  if (!confirmedBy) {
    update.black_confirmed = false;
    update.white_confirmed = false;
  }

  await supabase
    .from('scoring_states')
    .upsert({ room_id: roomId, ...update });
}

// Finalize game result
export async function finalizeGame(roomId: string, result: string) {
  await supabase
    .from('game_states')
    .update({ result })
    .eq('room_id', roomId);

  await supabase
    .from('rooms')
    .update({ status: 'finished' })
    .eq('id', roomId);
}

// Request scoring (ask opponent to agree to count)
export async function requestScoring(roomId: string, requestedBy: Color) {
  const { error } = await supabase
    .from('game_states')
    .update({ scoring_requested_by: requestedBy })
    .eq('room_id', roomId);
  if (error) throw error;
}

// Accept scoring request → transition to scoring phase
export async function acceptScoring(roomId: string) {
  await supabase.from('scoring_states').upsert({
    room_id: roomId,
    dead_stones: '',
    black_confirmed: false,
    white_confirmed: false,
  });
  await supabase.from('rooms').update({ status: 'scoring' }).eq('id', roomId);
  await supabase.from('game_states').update({ scoring_requested_by: null }).eq('room_id', roomId);
}

// Cancel scoring — return to playing
export async function cancelScoring(roomId: string) {
  await supabase.from('rooms').update({ status: 'playing' }).eq('id', roomId);
  await supabase.from('scoring_states').delete().eq('room_id', roomId);
  await supabase.from('game_states').update({ scoring_requested_by: null }).eq('room_id', roomId);
}

// Reject scoring request
export async function rejectScoring(roomId: string) {
  await supabase
    .from('game_states')
    .update({ scoring_requested_by: null })
    .eq('room_id', roomId);
}

// Fetch all moves for a room (for undo replay)
export async function fetchMoves(roomId: string) {
  const { data, error } = await supabase
    .from('moves')
    .select('*')
    .eq('room_id', roomId)
    .order('move_number', { ascending: true });
  if (error) throw error;
  return data || [];
}

// Apply undo - replay moves excluding the last one
export async function applyUndo(
  roomId: string,
  newBoard: Board,
  moveCount: number,
  currentPlayer: Color,
  consecutivePasses: number,
  capturesBlack: number,
  capturesWhite: number,
  previousBoardHash: string | null
) {
  await supabase
    .from('game_states')
    .update({
      board: boardToString(newBoard),
      current_player: currentPlayer,
      move_count: moveCount,
      consecutive_passes: consecutivePasses,
      captures_black: capturesBlack,
      captures_white: capturesWhite,
      previous_board_hash: previousBoardHash,
      updated_at: new Date().toISOString(),
    })
    .eq('room_id', roomId);

  // Delete the last move record
  await supabase
    .from('moves')
    .delete()
    .eq('room_id', roomId)
    .eq('move_number', moveCount + 1);
}
