-- Waitlist System
-- Adds waitlist support to event RSVP system
-- Migration: 20260125_waitlist_system

-- Add 'waitlisted' status to the rsvp_status enum
ALTER TYPE rsvp_status ADD VALUE 'waitlisted';

-- Add waitlist_position column to event_rsvps
-- This tracks the user's position in the FIFO waitlist queue
ALTER TABLE public.event_rsvps
ADD COLUMN waitlist_position INTEGER;

-- Create index for efficient waitlist queries
CREATE INDEX idx_event_rsvps_waitlist ON public.event_rsvps(event_id, status, waitlist_position)
WHERE status = 'waitlisted';

-- Add helpful comment
COMMENT ON COLUMN public.event_rsvps.waitlist_position IS 'FIFO position in waitlist queue (1 = first in line). NULL for non-waitlisted RSVPs.';

-- Create function to reorder waitlist positions after promotion
-- This ensures FIFO ordering remains correct after someone is promoted
CREATE OR REPLACE FUNCTION reorder_waitlist(p_event_id UUID)
RETURNS VOID AS $$
DECLARE
    rsvp_record RECORD;
    new_position INTEGER := 1;
BEGIN
    -- Loop through waitlisted RSVPs in order of their current position
    FOR rsvp_record IN
        SELECT id
        FROM public.event_rsvps
        WHERE event_id = p_event_id
          AND status = 'waitlisted'
        ORDER BY waitlist_position ASC
    LOOP
        -- Update each position sequentially (1, 2, 3, ...)
        UPDATE public.event_rsvps
        SET waitlist_position = new_position,
            updated_at = NOW()
        WHERE id = rsvp_record.id;

        new_position := new_position + 1;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment for the function
COMMENT ON FUNCTION reorder_waitlist(UUID) IS 'Reorders waitlist positions sequentially after a promotion to maintain FIFO order';
