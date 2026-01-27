-- Add end_time to search functions
-- Migration: 20260127_add_end_time_to_search

-- Drop and recreate search_events_ranked function to include end_time
DROP FUNCTION IF EXISTS public.search_events_ranked(TEXT, INT, UUID, event_type, TIMESTAMPTZ, TIMESTAMPTZ, event_size);

CREATE OR REPLACE FUNCTION public.search_events_ranked(
    search_query TEXT,
    max_results INT DEFAULT 20,
    current_user_id UUID DEFAULT NULL,
    filter_event_type event_type DEFAULT NULL,
    filter_start_date TIMESTAMPTZ DEFAULT NULL,
    filter_end_date TIMESTAMPTZ DEFAULT NULL,
    filter_event_size event_size DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    description TEXT,
    event_type event_type,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    venue_name TEXT,
    venue_address TEXT,
    capacity INT,
    cover_image_url TEXT,
    visibility event_visibility,
    creator_id UUID,
    group_id UUID,
    event_size event_size,
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

    -- Return relevance-ranked results with filters applied
    -- ts_rank_cd uses cover density ranking for better relevance
    RETURN QUERY
    SELECT
        e.id,
        e.title,
        e.description,
        e.event_type,
        e.start_time,
        e.end_time,
        e.venue_name,
        e.venue_address,
        e.capacity,
        e.cover_image_url,
        e.visibility,
        e.creator_id,
        e.group_id,
        e.event_size,
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
        -- Event type filter
        AND (filter_event_type IS NULL OR e.event_type = filter_event_type)
        -- Date range filter (start date)
        AND (filter_start_date IS NULL OR e.start_time >= filter_start_date)
        -- Date range filter (end date)
        AND (filter_end_date IS NULL OR e.start_time <= filter_end_date)
        -- Event size filter
        AND (filter_event_size IS NULL OR e.event_size = filter_event_size)
    ORDER BY
        -- Primary sort: relevance rank (higher is more relevant)
        rank DESC,
        -- Secondary sort: sooner events first
        e.start_time ASC
    LIMIT max_results;
END;
$$;

-- Add helpful comment
COMMENT ON FUNCTION public.search_events_ranked IS 'Full-text search for events with relevance ranking, typo tolerance, filters (type, date range, size), and end_time';

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.search_events_ranked TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_events_ranked TO anon;
