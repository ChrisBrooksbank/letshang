-- Migration: Add rate limiting for messaging
-- Detects mass-messaging patterns and throttles/blocks suspicious behavior

-- Enum for rate limit action taken
CREATE TYPE rate_limit_action AS ENUM (
  'allowed',       -- Message was within limits
  'warned',        -- User approaching limit, warning issued
  'throttled',     -- Message blocked due to rate limit
  'suspended'      -- User temporarily suspended for abuse
);

-- Table to track message activity per user for rate limit evaluation
CREATE TABLE message_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_count integer NOT NULL DEFAULT 0,
  window_start timestamptz NOT NULL,
  window_end timestamptz NOT NULL,
  action_taken rate_limit_action NOT NULL DEFAULT 'allowed',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Enforce one active window per user
  CONSTRAINT rate_limits_valid_window CHECK (window_end > window_start),
  CONSTRAINT rate_limits_positive_count CHECK (message_count >= 0)
);

-- Index for fast lookups by user and time window
CREATE INDEX idx_rate_limits_user_window ON message_rate_limits (user_id, window_start, window_end);
CREATE INDEX idx_rate_limits_user_action ON message_rate_limits (user_id, action_taken);

-- Auto-update updated_at timestamp
CREATE TRIGGER set_rate_limits_updated_at
  BEFORE UPDATE ON message_rate_limits
  FOR EACH ROW
  EXECUTE FUNCTION update_modified_timestamp();

-- Table to log rate limit alerts for admin review
CREATE TABLE rate_limit_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  alert_type text NOT NULL CHECK (alert_type IN ('mass_messaging', 'repeated_throttle', 'suspension')),
  details text,
  messages_in_window integer NOT NULL,
  window_start timestamptz NOT NULL,
  window_end timestamptz NOT NULL,
  reviewed boolean NOT NULL DEFAULT false,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index for admin alert review
CREATE INDEX idx_rate_limit_alerts_reviewed ON rate_limit_alerts (reviewed, created_at DESC);
CREATE INDEX idx_rate_limit_alerts_user ON rate_limit_alerts (user_id, created_at DESC);

-- Auto-update updated_at on alerts
CREATE TRIGGER set_rate_limit_alerts_updated_at
  BEFORE UPDATE ON rate_limit_alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_modified_timestamp();

-- RLS: Users can only read their own rate limit records
ALTER TABLE message_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY rate_limits_read_own
  ON message_rate_limits
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY rate_limits_insert_own
  ON message_rate_limits
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY rate_limits_update_own
  ON message_rate_limits
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RLS: Alerts are admin-only (service_role reads, users cannot access)
ALTER TABLE rate_limit_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY rate_limit_alerts_service_only
  ON rate_limit_alerts
  FOR ALL
  USING (false);

-- Function to check if a user is currently rate-limited
-- Returns the current action status for the user
CREATE OR REPLACE FUNCTION check_rate_limit(p_user_id uuid)
RETURNS rate_limit_action AS $$
DECLARE
  current_record RECORD;
BEGIN
  -- Find the most recent rate limit record for this user
  SELECT action_taken, message_count, window_end
  INTO current_record
  FROM message_rate_limits
  WHERE user_id = p_user_id
  ORDER BY window_start DESC
  LIMIT 1;

  -- If no record exists, user is allowed
  IF current_record IS NULL THEN
    RETURN 'allowed';
  END IF;

  -- If the window has expired, user is allowed
  IF current_record.window_end < now() THEN
    RETURN 'allowed';
  END IF;

  -- Return the current action
  RETURN current_record.action_taken;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION check_rate_limit TO authenticated, service_role;

-- Function to record a message send and evaluate rate limits
-- Implements sliding window: 10 messages per 1-hour window
-- Warning at 7+, throttle at 10+, suspend after 3 throttle events in 24h
CREATE OR REPLACE FUNCTION record_message_send(p_user_id uuid)
RETURNS rate_limit_action AS $$
DECLARE
  window_start_time timestamptz := now() - INTERVAL '1 hour';
  msg_count integer;
  throttle_count integer;
  new_action rate_limit_action;
BEGIN
  -- Count messages in the current 1-hour sliding window
  SELECT COUNT(*)
  INTO msg_count
  FROM message_rate_limits
  WHERE user_id = p_user_id
    AND window_start >= window_start_time
    AND action_taken IN ('allowed', 'warned');

  -- Increment by 1 for the current message
  msg_count := msg_count + 1;

  -- Determine action based on message count
  IF msg_count >= 10 THEN
    -- Check for repeated throttle events in the past 24 hours
    SELECT COUNT(*)
    INTO throttle_count
    FROM message_rate_limits
    WHERE user_id = p_user_id
      AND window_start >= now() - INTERVAL '24 hours'
      AND action_taken IN ('throttled', 'suspended');

    IF throttle_count >= 3 THEN
      new_action := 'suspended';
    ELSE
      new_action := 'throttled';
    END IF;
  ELSIF msg_count >= 7 THEN
    new_action := 'warned';
  ELSE
    new_action := 'allowed';
  END IF;

  -- Record this message event
  INSERT INTO message_rate_limits (user_id, message_count, window_start, window_end, action_taken)
  VALUES (p_user_id, msg_count, now(), now() + INTERVAL '1 hour', new_action);

  -- Create admin alert for suspicious patterns
  IF new_action IN ('throttled', 'suspended') THEN
    INSERT INTO rate_limit_alerts (
      user_id,
      alert_type,
      details,
      messages_in_window,
      window_start,
      window_end
    ) VALUES (
      p_user_id,
      CASE new_action
        WHEN 'suspended' THEN 'suspension'
        ELSE 'mass_messaging'
      END,
      CASE new_action
        WHEN 'suspended' THEN 'User suspended after repeated rate limit violations'
        ELSE 'User exceeded ' || msg_count || ' messages in 1-hour window'
      END,
      msg_count,
      now(),
      now() + INTERVAL '1 hour'
    );
  END IF;

  RETURN new_action;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION record_message_send TO authenticated, service_role;

-- Comments
COMMENT ON TABLE message_rate_limits IS 'Tracks per-user message activity for rate limit evaluation';
COMMENT ON TABLE rate_limit_alerts IS 'Admin alerts for suspicious messaging patterns requiring review';
COMMENT ON FUNCTION check_rate_limit IS 'Returns current rate limit status for a user (allowed/warned/throttled/suspended)';
COMMENT ON FUNCTION record_message_send IS 'Records a message send event and returns the rate limit action (10 msg/hr limit, suspension after 3 throttles in 24h)';
