-- RSVP Schema
-- Creates event_rsvps table for three-tier RSVP system
-- Migration: 20260122_rsvp_schema

-- Create enum for RSVP status
CREATE TYPE rsvp_status AS ENUM ('going', 'interested', 'not_going');

-- Create event_rsvps table
CREATE TABLE IF NOT EXISTS public.event_rsvps (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Foreign keys
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

    -- RSVP status
    status rsvp_status NOT NULL,

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    -- One RSVP per user per event
    CONSTRAINT unique_rsvp_per_user_per_event UNIQUE (event_id, user_id)
);

-- Create indexes for common queries
CREATE INDEX idx_event_rsvps_event_id ON public.event_rsvps(event_id);
CREATE INDEX idx_event_rsvps_user_id ON public.event_rsvps(user_id);
CREATE INDEX idx_event_rsvps_status ON public.event_rsvps(status);
CREATE INDEX idx_event_rsvps_created_at ON public.event_rsvps(created_at);

-- Create composite index for event attendee counts
CREATE INDEX idx_event_rsvps_event_status ON public.event_rsvps(event_id, status);

-- Enable Row Level Security
ALTER TABLE public.event_rsvps ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can read their own RSVPs
CREATE POLICY "Users can read own RSVPs"
    ON public.event_rsvps
    FOR SELECT
    USING (auth.uid() = user_id);

-- RLS Policy: Users who have RSVPed can see other attendees for that event
CREATE POLICY "RSVPed users can see other attendees"
    ON public.event_rsvps
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.event_rsvps
            WHERE event_id = event_rsvps.event_id
            AND user_id = auth.uid()
        )
    );

-- RLS Policy: Event creators can see all RSVPs for their events
CREATE POLICY "Event creators can see all RSVPs"
    ON public.event_rsvps
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.events
            WHERE id = event_rsvps.event_id
            AND creator_id = auth.uid()
        )
    );

-- RLS Policy: Authenticated users can create RSVPs
CREATE POLICY "Authenticated users can create RSVPs"
    ON public.event_rsvps
    FOR INSERT
    WITH CHECK (
        auth.role() = 'authenticated'
        AND auth.uid() = user_id
    );

-- RLS Policy: Users can update their own RSVPs
CREATE POLICY "Users can update own RSVPs"
    ON public.event_rsvps
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can delete their own RSVPs
CREATE POLICY "Users can delete own RSVPs"
    ON public.event_rsvps
    FOR DELETE
    USING (auth.uid() = user_id);

-- Create trigger to update updated_at on row update
CREATE TRIGGER update_event_rsvps_updated_at
    BEFORE UPDATE ON public.event_rsvps
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add helpful comments
COMMENT ON TABLE public.event_rsvps IS 'Event RSVPs with three-tier status: going, interested, not_going';
COMMENT ON COLUMN public.event_rsvps.id IS 'Unique RSVP identifier';
COMMENT ON COLUMN public.event_rsvps.event_id IS 'Event being RSVPed to';
COMMENT ON COLUMN public.event_rsvps.user_id IS 'User making the RSVP';
COMMENT ON COLUMN public.event_rsvps.status IS 'RSVP status: going (confirmed), interested (soft commit), not_going (declined)';
COMMENT ON COLUMN public.event_rsvps.created_at IS 'When the RSVP was first created';
COMMENT ON COLUMN public.event_rsvps.updated_at IS 'When the RSVP was last modified';
