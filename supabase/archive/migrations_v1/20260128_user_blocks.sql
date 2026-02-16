-- User Blocks
-- Enables users to block other users, preventing all contact

CREATE TABLE IF NOT EXISTS user_blocks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  blocker_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason text,  -- Optional reason for blocking (max 500 chars)
  blocked_at timestamptz DEFAULT now() NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  -- Prevent duplicate blocks
  CONSTRAINT user_blocks_unique UNIQUE (blocker_id, blocked_id),
  -- Prevent self-blocking
  CONSTRAINT user_blocks_no_self_block CHECK (blocker_id <> blocked_id),
  -- Reason max length
  CONSTRAINT user_blocks_reason_length CHECK (reason IS NULL OR char_length(reason) <= 500)
);

-- Index for querying blocks by blocker (who did I block?)
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker_id
  ON user_blocks(blocker_id);

-- Index for querying blocks by blocked user (who blocked me?)
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked_id
  ON user_blocks(blocked_id);

-- RLS: Users can only manage their own blocks
ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own blocks"
  ON user_blocks
  FOR SELECT
  USING (blocker_id = auth.uid());

CREATE POLICY "Users can create blocks"
  ON user_blocks
  FOR INSERT
  WITH CHECK (blocker_id = auth.uid());

CREATE POLICY "Users can remove own blocks"
  ON user_blocks
  FOR DELETE
  USING (blocker_id = auth.uid());

-- Function to check if a user has blocked another
CREATE OR REPLACE FUNCTION is_user_blocked(p_blocker_id uuid, p_blocked_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_blocks
    WHERE blocker_id = p_blocker_id AND blocked_id = p_blocked_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION is_user_blocked(uuid, uuid) TO authenticated;
