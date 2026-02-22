import { supabase } from './client';
import { RoomConfig } from '../go/types';

export interface RoomRow {
  id: string;
  created_by: string;
  status: string;
  komi: number;
  color_preference: string;
  main_time_seconds: number;
  byoyomi_seconds: number;
  byoyomi_periods: number;
  created_at: string;
}

export interface PlayerRow {
  id: string;
  room_id: string;
  nickname: string;
  color: string;
  connected: boolean;
  main_time_remaining: number;
  byoyomi_remaining: number;
  byoyomi_periods_left: number;
}

export async function createRoom(nickname: string, config: RoomConfig) {
  // Create the room
  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .insert({
      created_by: nickname,
      komi: config.komi,
      color_preference: config.colorPreference,
      main_time_seconds: config.mainTimeSeconds,
      byoyomi_seconds: config.byoyomiSeconds,
      byoyomi_periods: config.byoyomiPeriods,
    })
    .select()
    .single();

  if (roomError) throw roomError;

  // Determine creator's color
  let myColor: 'black' | 'white';
  if (config.colorPreference === 'random') {
    myColor = Math.random() < 0.5 ? 'black' : 'white';
  } else {
    myColor = config.colorPreference;
  }

  // Add creator as player
  const { error: playerError } = await supabase.from('players').insert({
    room_id: room.id,
    nickname,
    color: myColor,
    main_time_remaining: config.mainTimeSeconds,
    byoyomi_remaining: config.byoyomiSeconds,
    byoyomi_periods_left: config.byoyomiPeriods,
  });

  if (playerError) throw playerError;

  // Create initial game state
  const { error: gameError } = await supabase.from('game_states').insert({
    room_id: room.id,
    board: '.'.repeat(361),
  });

  if (gameError) throw gameError;

  return { roomId: room.id, myColor };
}

export async function joinRoom(roomId: string, nickname: string): Promise<{ myColor: 'black' | 'white' }> {
  // Get room info
  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .select('*')
    .eq('id', roomId)
    .single();

  if (roomError) throw roomError;
  if (room.status !== 'waiting') throw new Error('Room is not available');

  // Get existing player
  const { data: existingPlayers } = await supabase
    .from('players')
    .select('*')
    .eq('room_id', roomId);

  if (!existingPlayers || existingPlayers.length === 0) {
    throw new Error('Room has no players');
  }
  if (existingPlayers.length >= 2) {
    throw new Error('Room is full');
  }

  // Take the opposite color
  const takenColor = existingPlayers[0].color;
  const myColor = takenColor === 'black' ? 'white' : 'black';

  // Join as player
  const { error: joinError } = await supabase.from('players').insert({
    room_id: roomId,
    nickname,
    color: myColor,
    main_time_remaining: room.main_time_seconds,
    byoyomi_remaining: room.byoyomi_seconds,
    byoyomi_periods_left: room.byoyomi_periods,
  });

  if (joinError) throw joinError;

  // Update room status to playing
  await supabase
    .from('rooms')
    .update({ status: 'playing' })
    .eq('id', roomId);

  return { myColor };
}

export async function listWaitingRooms() {
  const { data, error } = await supabase
    .from('rooms')
    .select('*, players(*)')
    .eq('status', 'waiting')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;
  return data;
}

export async function getRoom(roomId: string) {
  const { data, error } = await supabase
    .from('rooms')
    .select('*, players(*), game_states(*)')
    .eq('id', roomId)
    .single();

  if (error) throw error;
  return data;
}
