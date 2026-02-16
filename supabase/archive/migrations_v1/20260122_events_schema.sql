-- Events Schema
-- Creates events table for standalone and group events
-- Migration: 20260122_events_schema

-- Create enum for event types
CREATE TYPE event_type AS ENUM ('in_person', 'online', 'hybrid');

-- Create enum for event visibility
CREATE TYPE event_visibility AS ENUM ('public', 'group_only', 'hidden');

-- Create events table
CREATE TABLE IF NOT EXISTS public.events (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Creator/host information
    creator_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

    -- Group association (NULL for standalone events)
    group_id UUID DEFAULT NULL, -- Will reference groups table when implemented

    -- Basic event information
    title TEXT NOT NULL CHECK (char_length(title) >= 5 AND char_length(title) <= 100),
    description TEXT NOT NULL CHECK (char_length(description) <= 5000),

    -- Event type and visibility
    event_type event_type NOT NULL,
    visibility event_visibility NOT NULL DEFAULT 'public',

    -- Scheduling
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    duration_minutes INTEGER, -- Stored for convenience when end_time not set

    -- Location fields (for in-person and hybrid events)
    venue_name TEXT,
    venue_address TEXT,
    venue_lat DECIMAL(10, 8), -- Latitude for map integration
    venue_lng DECIMAL(11, 8), -- Longitude for map integration

    -- Online event fields (for online and hybrid events)
    video_link TEXT, -- Zoom, Meet, etc.

    -- Capacity and attendee limits
    capacity INTEGER CHECK (capacity IS NULL OR (capacity >= 1 AND capacity <= 10000)),

    -- Cover image
    cover_image_url TEXT,

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT end_time_after_start CHECK (
        end_time IS NULL OR end_time > start_time
    ),
    CONSTRAINT duration_positive CHECK (
        duration_minutes IS NULL OR duration_minutes > 0
    ),
    CONSTRAINT in_person_has_venue CHECK (
        event_type != 'in_person' OR (venue_name IS NOT NULL AND venue_address IS NOT NULL)
    ),
    CONSTRAINT online_has_link CHECK (
        event_type != 'online' OR video_link IS NOT NULL
    ),
    CONSTRAINT hybrid_has_both CHECK (
        event_type != 'hybrid' OR (
            venue_name IS NOT NULL AND
            venue_address IS NOT NULL AND
            video_link IS NOT NULL
        )
    )
);

-- Create indexes for common queries
CREATE INDEX idx_events_creator_id ON public.events(creator_id);
CREATE INDEX idx_events_group_id ON public.events(group_id) WHERE group_id IS NOT NULL;
CREATE INDEX idx_events_start_time ON public.events(start_time);
CREATE INDEX idx_events_created_at ON public.events(created_at);
CREATE INDEX idx_events_event_type ON public.events(event_type);
CREATE INDEX idx_events_visibility ON public.events(visibility);

-- Create composite index for discovery queries
CREATE INDEX idx_events_visibility_start_time ON public.events(visibility, start_time);

-- Create GiST index for spatial queries (map-based discovery)
CREATE INDEX idx_events_location ON public.events USING GIST (
    point(venue_lng, venue_lat)
) WHERE venue_lat IS NOT NULL AND venue_lng IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Anyone can read public events
CREATE POLICY "Anyone can read public events"
    ON public.events
    FOR SELECT
    USING (visibility = 'public');

-- RLS Policy: Authenticated users can read all public events
CREATE POLICY "Authenticated users can read public events"
    ON public.events
    FOR SELECT
    USING (
        auth.role() = 'authenticated'
        AND visibility = 'public'
    );

-- RLS Policy: Event creators can read their own events
CREATE POLICY "Creators can read own events"
    ON public.events
    FOR SELECT
    USING (auth.uid() = creator_id);

-- RLS Policy: Event creators can update their own events
CREATE POLICY "Creators can update own events"
    ON public.events
    FOR UPDATE
    USING (auth.uid() = creator_id)
    WITH CHECK (auth.uid() = creator_id);

-- RLS Policy: Event creators can delete their own events
CREATE POLICY "Creators can delete own events"
    ON public.events
    FOR DELETE
    USING (auth.uid() = creator_id);

-- RLS Policy: Authenticated users can create events
CREATE POLICY "Authenticated users can create events"
    ON public.events
    FOR INSERT
    WITH CHECK (
        auth.role() = 'authenticated'
        AND auth.uid() = creator_id
    );

-- Create trigger to update updated_at on row update
CREATE TRIGGER update_events_updated_at
    BEFORE UPDATE ON public.events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add helpful comments
COMMENT ON TABLE public.events IS 'Events - scheduled meetups that can be standalone or group-hosted';
COMMENT ON COLUMN public.events.id IS 'Unique event identifier';
COMMENT ON COLUMN public.events.creator_id IS 'User who created the event (becomes host)';
COMMENT ON COLUMN public.events.group_id IS 'Associated group (NULL for standalone events)';
COMMENT ON COLUMN public.events.title IS 'Event title (5-100 chars)';
COMMENT ON COLUMN public.events.description IS 'Event description (max 5000 chars)';
COMMENT ON COLUMN public.events.event_type IS 'Type: in_person, online, or hybrid';
COMMENT ON COLUMN public.events.visibility IS 'Who can see this event: public, group_only, or hidden';
COMMENT ON COLUMN public.events.start_time IS 'Event start date and time';
COMMENT ON COLUMN public.events.end_time IS 'Event end date and time (optional)';
COMMENT ON COLUMN public.events.duration_minutes IS 'Event duration in minutes (alternative to end_time)';
COMMENT ON COLUMN public.events.venue_name IS 'Venue name for in-person/hybrid events';
COMMENT ON COLUMN public.events.venue_address IS 'Full address for in-person/hybrid events';
COMMENT ON COLUMN public.events.venue_lat IS 'Venue latitude for map integration';
COMMENT ON COLUMN public.events.venue_lng IS 'Venue longitude for map integration';
COMMENT ON COLUMN public.events.video_link IS 'Video conference link for online/hybrid events';
COMMENT ON COLUMN public.events.capacity IS 'Maximum attendees (1-10000, NULL for unlimited)';
COMMENT ON COLUMN public.events.cover_image_url IS 'URL to cover image in Supabase Storage';
