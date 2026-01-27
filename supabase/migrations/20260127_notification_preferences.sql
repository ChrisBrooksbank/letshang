-- Notification Preferences Schema
-- Stores user preferences for notification channels and types

-- Create enum for notification types
CREATE TYPE notification_type AS ENUM (
  'new_event_in_group',
  'rsvp_confirmation',
  'event_reminder',
  'waitlist_promotion',
  'new_message',
  'group_announcement',
  'event_update_cancellation'
);

-- Create notification preferences table
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type notification_type NOT NULL,
  push_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  email_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  in_app_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure one row per user per notification type
  UNIQUE (user_id, notification_type)
);

-- Create updated_at trigger
CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create index for efficient lookups
CREATE INDEX idx_notification_preferences_user_id ON notification_preferences(user_id);

-- Enable RLS
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only view/modify their own preferences
CREATE POLICY "Users can view own notification preferences"
  ON notification_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification preferences"
  ON notification_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notification preferences"
  ON notification_preferences
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Function to initialize default notification preferences for a new user
CREATE OR REPLACE FUNCTION initialize_notification_preferences(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_notification_type notification_type;
BEGIN
  -- Insert default preferences for all notification types
  FOREACH v_notification_type IN ARRAY ENUM_RANGE(NULL::notification_type)
  LOOP
    INSERT INTO notification_preferences (user_id, notification_type, push_enabled, email_enabled, in_app_enabled)
    VALUES (
      p_user_id,
      v_notification_type,
      -- Set default based on notification type (per spec)
      CASE
        WHEN v_notification_type = 'rsvp_confirmation' THEN FALSE -- Push: No
        ELSE TRUE -- All other types default to TRUE for push
      END,
      TRUE, -- Email defaults to TRUE for all types
      TRUE  -- In-app defaults to TRUE for all types
    )
    ON CONFLICT (user_id, notification_type) DO NOTHING;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create notification preferences on user signup
CREATE OR REPLACE FUNCTION handle_new_user_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM initialize_notification_preferences(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created_notification_preferences
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user_notification_preferences();
