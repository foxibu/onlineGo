-- Room table
CREATE TABLE rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting',  -- waiting, playing, scoring, finished
  komi DECIMAL(3,1) DEFAULT 6.5,
  color_preference TEXT DEFAULT 'random',
  main_time_seconds INT DEFAULT 600,
  byoyomi_seconds INT DEFAULT 30,
  byoyomi_periods INT DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Players table
CREATE TABLE players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL,
  color TEXT NOT NULL,
  connected BOOLEAN DEFAULT true,
  main_time_remaining INT,
  byoyomi_remaining INT,
  byoyomi_periods_left INT,
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(room_id, color)
);

-- Game state table
CREATE TABLE game_states (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE UNIQUE,
  current_player TEXT DEFAULT 'black',
  board TEXT DEFAULT REPEAT('.', 361),
  move_count INT DEFAULT 0,
  consecutive_passes INT DEFAULT 0,
  captures_black INT DEFAULT 0,
  captures_white INT DEFAULT 0,
  last_move_at TIMESTAMPTZ,
  previous_board_hash TEXT,
  result TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Move history table
CREATE TABLE moves (
  id SERIAL PRIMARY KEY,
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  move_number INT NOT NULL,
  x INT,
  y INT,
  color TEXT NOT NULL,
  move_type TEXT DEFAULT 'place',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Undo requests table
CREATE TABLE undo_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  requested_by TEXT NOT NULL,
  move_number INT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Scoring state table
CREATE TABLE scoring_states (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE UNIQUE,
  dead_stones TEXT DEFAULT '',
  black_confirmed BOOLEAN DEFAULT false,
  white_confirmed BOOLEAN DEFAULT false
);

-- Chat messages table
CREATE TABLE chat_messages (
  id SERIAL PRIMARY KEY,
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  sender TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Realtime for all game tables
ALTER PUBLICATION supabase_realtime ADD TABLE rooms, game_states, players, undo_requests, scoring_states, chat_messages;

-- RLS: Public access (anonymous game - no auth required)
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rooms_public" ON rooms FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "players_public" ON players FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE game_states ENABLE ROW LEVEL SECURITY;
CREATE POLICY "game_states_public" ON game_states FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE moves ENABLE ROW LEVEL SECURITY;
CREATE POLICY "moves_public" ON moves FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE undo_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "undo_requests_public" ON undo_requests FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE scoring_states ENABLE ROW LEVEL SECURITY;
CREATE POLICY "scoring_states_public" ON scoring_states FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chat_messages_public" ON chat_messages FOR ALL USING (true) WITH CHECK (true);

-- Indexes for common queries
CREATE INDEX idx_rooms_status ON rooms(status);
CREATE INDEX idx_players_room_id ON players(room_id);
CREATE INDEX idx_game_states_room_id ON game_states(room_id);
CREATE INDEX idx_moves_room_id ON moves(room_id);
CREATE INDEX idx_moves_room_number ON moves(room_id, move_number);
CREATE INDEX idx_undo_requests_room_id ON undo_requests(room_id);
CREATE INDEX idx_chat_messages_room_id ON chat_messages(room_id);
