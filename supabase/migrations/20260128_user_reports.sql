-- User Reports
-- One-tap reporting for messages and profiles with category classification

CREATE TYPE report_category AS ENUM ('harassment', 'spam', 'inappropriate', 'safety');

CREATE TABLE IF NOT EXISTS user_reports (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reported_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category report_category NOT NULL,
  context text,  -- Automatically included context (e.g., message content, profile snippet)
  additional_details text,  -- Optional extra details from the reporter
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved')),
  reported_at timestamptz DEFAULT now() NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  -- Prevent self-reporting
  CONSTRAINT user_reports_no_self_report CHECK (reporter_id <> reported_user_id),
  -- Context max length
  CONSTRAINT user_reports_context_length CHECK (context IS NULL OR char_length(context) <= 1000),
  -- Additional details max length
  CONSTRAINT user_reports_details_length CHECK (additional_details IS NULL OR char_length(additional_details) <= 500)
);

-- Index for querying reports by reporter
CREATE INDEX IF NOT EXISTS idx_user_reports_reporter_id
  ON user_reports(reporter_id);

-- Index for querying reports by reported user
CREATE INDEX IF NOT EXISTS idx_user_reports_reported_user_id
  ON user_reports(reported_user_id);

-- Index for querying reports by status (for admin review)
CREATE INDEX IF NOT EXISTS idx_user_reports_status
  ON user_reports(status);

-- RLS: Users can only view and create their own reports
ALTER TABLE user_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reports"
  ON user_reports
  FOR SELECT
  USING (reporter_id = auth.uid());

CREATE POLICY "Users can create reports"
  ON user_reports
  FOR INSERT
  WITH CHECK (reporter_id = auth.uid());

-- Prevent duplicate reports for the same user within 24 hours
-- (application-level check, not a constraint, to allow re-reporting after resolution)
