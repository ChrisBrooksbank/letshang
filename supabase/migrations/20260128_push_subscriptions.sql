-- Push Subscriptions
-- Stores Web Push API subscription data for delivering push notifications

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  p256dh text NOT NULL,  -- Public encryption key
  auth text NOT NULL,    -- Auth secret
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  -- Prevent duplicate subscriptions for the same endpoint
  CONSTRAINT push_subscriptions_endpoint_unique UNIQUE (endpoint)
);

-- Index for querying subscriptions by user
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id
  ON push_subscriptions(user_id);

-- RLS: Users can only manage their own push subscriptions
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own push subscriptions"
  ON push_subscriptions
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own push subscriptions"
  ON push_subscriptions
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own push subscriptions"
  ON push_subscriptions
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own push subscriptions"
  ON push_subscriptions
  FOR DELETE
  USING (user_id = auth.uid());

-- Push Delivery Log
-- Tracks delivery status of push notifications for confirmation

CREATE TABLE IF NOT EXISTS push_delivery_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_type text NOT NULL,
  subscription_endpoint text NOT NULL,
  status text NOT NULL DEFAULT 'pending',  -- pending, delivered, failed
  error_message text,
  attempted_at timestamptz DEFAULT now() NOT NULL,
  delivered_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT push_delivery_log_status_check
    CHECK (status IN ('pending', 'delivered', 'failed'))
);

-- Index for querying delivery logs by user
CREATE INDEX IF NOT EXISTS idx_push_delivery_log_user_id
  ON push_delivery_log(user_id);

-- Index for querying recent delivery logs
CREATE INDEX IF NOT EXISTS idx_push_delivery_log_attempted_at
  ON push_delivery_log(attempted_at DESC);

-- RLS for delivery log: users can view their own logs
ALTER TABLE push_delivery_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own push delivery logs"
  ON push_delivery_log
  FOR SELECT
  USING (user_id = auth.uid());

-- Service role can insert delivery logs
CREATE POLICY "Service role can manage push delivery logs"
  ON push_delivery_log
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Function to get push subscriptions for a user (for server-side sending)
CREATE OR REPLACE FUNCTION get_user_push_subscriptions(p_user_id uuid)
RETURNS TABLE (
  endpoint text,
  p256dh text,
  auth text
) AS $$
BEGIN
  RETURN QUERY
  SELECT ps.endpoint, ps.p256dh, ps.auth
  FROM push_subscriptions ps
  WHERE ps.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_user_push_subscriptions(uuid) TO authenticated;
