-- Migration: Add messaging_preferences table for connection-gated messaging
-- Allows users to control who can send them direct messages

-- Create enum for DM permission levels
CREATE TYPE dm_permission AS ENUM (
  'anyone',          -- Anyone can send DMs
  'connections',     -- Only connections (mutual follows) can send DMs
  'attendees',       -- Only event co-attendees can send DMs
  'organizers'       -- Only organizers of shared groups can send DMs
);

-- Create messaging preferences table
CREATE TABLE messaging_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  allow_dm_from dm_permission NOT NULL DEFAULT 'anyone',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT messaging_preferences_unique_user UNIQUE (user_id)
);

-- Index for fast user lookups
CREATE INDEX idx_messaging_preferences_user_id ON messaging_preferences (user_id);

-- Auto-update updated_at timestamp
CREATE TRIGGER set_messaging_preferences_updated_at
  BEFORE UPDATE ON messaging_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_modified_timestamp();

-- RLS: Users can only read and modify their own preferences
ALTER TABLE messaging_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY messaging_preferences_read_own
  ON messaging_preferences
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY messaging_preferences_insert_own
  ON messaging_preferences
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY messaging_preferences_update_own
  ON messaging_preferences
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Function to initialize messaging preferences for a new user
CREATE OR REPLACE FUNCTION initialize_messaging_preferences(p_user_id uuid)
RETURNS void AS $$
BEGIN
  INSERT INTO messaging_preferences (user_id, allow_dm_from)
  VALUES (p_user_id, 'anyone')
  ON CONFLICT (user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION initialize_messaging_preferences TO authenticated, service_role;

-- Function to check if a user can receive a DM from another user
-- This provides a single entry point for message permission checks
CREATE OR REPLACE FUNCTION can_receive_dm(recipient_id uuid, sender_id uuid)
RETURNS boolean AS $$
DECLARE
  perm dm_permission;
BEGIN
  -- Get the recipient's DM permission setting (default: anyone)
  SELECT allow_dm_from INTO perm
  FROM messaging_preferences
  WHERE user_id = recipient_id;

  -- If no preference found, default to 'anyone'
  IF perm IS NULL THEN
    RETURN true;
  END IF;

  -- 'anyone' always allows
  IF perm = 'anyone' THEN
    RETURN true;
  END IF;

  -- For other modes, additional checks would be needed when
  -- connections/co-attendance tables exist. For now, return true
  -- for modes that lack the supporting data, to avoid blocking
  -- legitimate messaging until the full social graph is built.
  -- The application layer should enforce these checks when available.
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION can_receive_dm TO authenticated, service_role;

-- Comment for documentation
COMMENT ON TABLE messaging_preferences IS 'Controls who can send direct messages to each user';
COMMENT ON COLUMN messaging_preferences.allow_dm_from IS 'DM permission level: anyone, connections, attendees, or organizers';
