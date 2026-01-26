-- Search Text Indexes
-- Adds full-text search indexes for events and groups
-- Migration: 20260126_search_text_indexes

-- Create full-text search index on events title and description
CREATE INDEX IF NOT EXISTS idx_events_search ON public.events USING gin(
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, ''))
);

-- Add helpful comments
COMMENT ON INDEX idx_events_search IS 'Full-text search index on event title and description';
