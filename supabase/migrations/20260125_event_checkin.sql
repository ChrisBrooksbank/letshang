-- Event Check-in System
-- Adds check-in tracking to event RSVPs
-- Migration: 20260125_event_checkin

-- Add checked_in_at column to event_rsvps
-- NULL means not checked in, timestamp means checked in at that time
ALTER TABLE public.event_rsvps
ADD COLUMN checked_in_at TIMESTAMPTZ;

-- Create index for efficient check-in queries
CREATE INDEX idx_event_rsvps_checked_in ON public.event_rsvps(event_id, checked_in_at)
WHERE checked_in_at IS NOT NULL;

-- Add helpful comment
COMMENT ON COLUMN public.event_rsvps.checked_in_at IS 'Timestamp when attendee was checked in by event host. NULL if not checked in.';

-- RLS Policy: Event creators can update checked_in_at for their events
CREATE POLICY "Event creators can check in attendees"
    ON public.event_rsvps
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.events
            WHERE id = event_rsvps.event_id
            AND creator_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.events
            WHERE id = event_rsvps.event_id
            AND creator_id = auth.uid()
        )
    );
