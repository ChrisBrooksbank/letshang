-- Search Functions for Relevance Ranking
-- Creates PostgreSQL functions for relevance-ranked full-text search
-- Migration: 20260126_search_functions

-- Function to search events with relevance ranking and typo tolerance
CREATE OR REPLACE FUNCTION public.search_events_ranked(
    search_query TEXT,
    max_results INT DEFAULT 20,
    current_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    description TEXT,
    event_type event_type,
    start_time TIMESTAMPTZ,
    venue_name TEXT,
    venue_address TEXT,
    capacity INT,
    cover_image_url TEXT,
    visibility event_visibility,
    creator_id UUID,
    group_id UUID,
    rank REAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    search_tsquery tsquery;
BEGIN
    -- Convert search query to tsquery with fuzzy matching
    -- websearch_to_tsquery handles phrases and provides better typo tolerance
    search_tsquery := websearch_to_tsquery('english', search_query);

    -- If the query produces no valid tsquery, try plain text
    IF search_tsquery IS NULL THEN
        search_tsquery := plainto_tsquery('english', search_query);
    END IF;

    -- If still null, return empty result
    IF search_tsquery IS NULL THEN
        RETURN;
    END IF;

    -- Return relevance-ranked results
    -- ts_rank_cd uses cover density ranking for better relevance
    RETURN QUERY
    SELECT
        e.id,
        e.title,
        e.description,
        e.event_type,
        e.start_time,
        e.venue_name,
        e.venue_address,
        e.capacity,
        e.cover_image_url,
        e.visibility,
        e.creator_id,
        e.group_id,
        ts_rank_cd(e.search_vector, search_tsquery) AS rank
    FROM public.events e
    WHERE
        -- Match the search query
        e.search_vector @@ search_tsquery
        -- Only future events
        AND e.start_time >= NOW()
        -- Visibility filtering
        AND (
            e.visibility = 'public'
            OR (current_user_id IS NOT NULL AND e.creator_id = current_user_id)
        )
    ORDER BY
        -- Primary sort: relevance rank (higher is more relevant)
        rank DESC,
        -- Secondary sort: sooner events first
        e.start_time ASC
    LIMIT max_results;
END;
$$;

-- Function to search groups with relevance ranking and typo tolerance
CREATE OR REPLACE FUNCTION public.search_groups_ranked(
    search_query TEXT,
    max_results INT DEFAULT 20,
    current_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    description TEXT,
    cover_image_url TEXT,
    group_type group_type,
    location TEXT,
    organizer_id UUID,
    rank REAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    search_tsquery tsquery;
BEGIN
    -- Convert search query to tsquery with fuzzy matching
    search_tsquery := websearch_to_tsquery('english', search_query);

    -- If the query produces no valid tsquery, try plain text
    IF search_tsquery IS NULL THEN
        search_tsquery := plainto_tsquery('english', search_query);
    END IF;

    -- If still null, return empty result
    IF search_tsquery IS NULL THEN
        RETURN;
    END IF;

    -- Return relevance-ranked results
    RETURN QUERY
    SELECT
        g.id,
        g.name,
        g.description,
        g.cover_image_url,
        g.group_type,
        g.location,
        g.organizer_id,
        ts_rank_cd(g.search_vector, search_tsquery) AS rank
    FROM public.groups g
    WHERE
        -- Match the search query
        g.search_vector @@ search_tsquery
        -- Only search public groups (private groups require membership check)
        AND g.group_type = 'public'
    ORDER BY
        -- Primary sort: relevance rank (higher is more relevant)
        rank DESC,
        -- Secondary sort: most recently created
        g.created_at DESC
    LIMIT max_results;
END;
$$;

-- Add helpful comments
COMMENT ON FUNCTION public.search_events_ranked IS 'Full-text search for events with relevance ranking and typo tolerance';
COMMENT ON FUNCTION public.search_groups_ranked IS 'Full-text search for groups with relevance ranking and typo tolerance';

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.search_events_ranked TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_groups_ranked TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_events_ranked TO anon;
GRANT EXECUTE ON FUNCTION public.search_groups_ranked TO anon;
