-- Search Relevance Ranking
-- Adds generated columns and indexes for relevance-ranked full-text search
-- Migration: 20260126_search_relevance_ranking

-- Add generated tsvector columns to events table for better search performance
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS search_vector tsvector
GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B')
) STORED;

-- Create GIN index on the generated search_vector column
CREATE INDEX IF NOT EXISTS idx_events_search_vector ON public.events USING gin(search_vector);

-- Add generated tsvector columns to groups table for better search performance
ALTER TABLE public.groups
ADD COLUMN IF NOT EXISTS search_vector tsvector
GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B')
) STORED;

-- Create GIN index on the generated search_vector column
CREATE INDEX IF NOT EXISTS idx_groups_search_vector ON public.groups USING gin(search_vector);

-- Add helpful comments
COMMENT ON COLUMN events.search_vector IS 'Generated tsvector for relevance-ranked full-text search (title weighted A, description weighted B)';
COMMENT ON COLUMN groups.search_vector IS 'Generated tsvector for relevance-ranked full-text search (name weighted A, description weighted B)';
COMMENT ON INDEX idx_events_search_vector IS 'GIN index on events search_vector for fast full-text queries';
COMMENT ON INDEX idx_groups_search_vector IS 'GIN index on groups search_vector for fast full-text queries';
