-- Push subscriptions table
-- Stores Web Push subscription per player per room
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  color TEXT NOT NULL CHECK (color IN ('black', 'white')),
  subscription JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- One subscription per player per room (upsert)
CREATE UNIQUE INDEX IF NOT EXISTS push_subscriptions_room_color
  ON push_subscriptions(room_id, color);
