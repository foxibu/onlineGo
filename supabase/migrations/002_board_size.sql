-- Add board_size column to rooms table
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS board_size INT NOT NULL DEFAULT 19;

-- Add scoring request field to game_states
ALTER TABLE game_states ADD COLUMN IF NOT EXISTS scoring_requested_by TEXT DEFAULT NULL;
