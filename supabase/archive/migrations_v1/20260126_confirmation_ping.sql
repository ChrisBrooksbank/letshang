-- Confirmation Ping System
-- Adds day-of confirmation tracking to event RSVP system
-- Migration: 20260126_confirmation_ping

-- Add confirmation_status column to event_rsvps
-- This tracks whether a user has confirmed their attendance on the day of the event
ALTER TABLE public.event_rsvps
ADD COLUMN confirmation_status TEXT CHECK (confirmation_status IN ('pending', 'confirmed', 'bailed_out')) DEFAULT 'pending',
ADD COLUMN confirmation_sent_at TIMESTAMPTZ,
ADD COLUMN confirmation_response_at TIMESTAMPTZ,
ADD COLUMN bail_out_reason TEXT;

-- Create index for confirmation queries
CREATE INDEX idx_event_rsvps_confirmation ON public.event_rsvps(event_id, confirmation_status)
WHERE status = 'going' AND confirmation_status IN ('pending', 'confirmed', 'bailed_out');

-- Add helpful comments
COMMENT ON COLUMN public.event_rsvps.confirmation_status IS 'Day-of confirmation status: pending (not responded), confirmed (still coming), bailed_out (can''t make it). Only applies to "going" RSVPs.';
COMMENT ON COLUMN public.event_rsvps.confirmation_sent_at IS 'When the "still coming?" ping was sent';
COMMENT ON COLUMN public.event_rsvps.confirmation_response_at IS 'When the user responded to the confirmation ping';
COMMENT ON COLUMN public.event_rsvps.bail_out_reason IS 'Optional reason provided when bailing out (max 500 chars)';

-- Function to check if confirmation pings should be sent for an event
-- Returns all "going" RSVPs that haven't been sent a confirmation ping yet
-- Confirmation pings are sent on the day of the event
CREATE OR REPLACE FUNCTION get_rsvps_needing_confirmation(p_event_id UUID)
RETURNS TABLE (
    rsvp_id UUID,
    user_id UUID,
    event_id UUID,
    event_start TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        er.id as rsvp_id,
        er.user_id,
        er.event_id,
        e.start_time as event_start
    FROM public.event_rsvps er
    JOIN public.events e ON e.id = er.event_id
    WHERE er.event_id = p_event_id
        AND er.status = 'going'
        AND er.confirmation_sent_at IS NULL
        AND DATE(e.start_time) = CURRENT_DATE
        AND e.start_time > NOW(); -- Only send if event hasn't started yet
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark confirmation ping as sent
CREATE OR REPLACE FUNCTION mark_confirmation_sent(p_rsvp_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.event_rsvps
    SET confirmation_sent_at = NOW(),
        updated_at = NOW()
    WHERE id = p_rsvp_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record confirmation response (still coming)
CREATE OR REPLACE FUNCTION confirm_attendance(p_rsvp_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.event_rsvps
    SET confirmation_status = 'confirmed',
        confirmation_response_at = NOW(),
        updated_at = NOW()
    WHERE id = p_rsvp_id
        AND status = 'going';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record bail-out response (can't make it)
-- This also promotes from waitlist if applicable
CREATE OR REPLACE FUNCTION bail_out_attendance(
    p_rsvp_id UUID,
    p_reason TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    v_event_id UUID;
    v_user_id UUID;
    v_event_capacity INTEGER;
    v_going_count INTEGER;
    v_first_waitlisted RECORD;
BEGIN
    -- Get the RSVP details
    SELECT event_id, user_id INTO v_event_id, v_user_id
    FROM public.event_rsvps
    WHERE id = p_rsvp_id AND status = 'going';

    IF NOT FOUND THEN
        RETURN; -- RSVP not found or not "going"
    END IF;

    -- Update RSVP to bailed_out status
    UPDATE public.event_rsvps
    SET status = 'not_going',
        confirmation_status = 'bailed_out',
        confirmation_response_at = NOW(),
        bail_out_reason = SUBSTRING(p_reason FROM 1 FOR 500), -- Limit to 500 chars
        updated_at = NOW()
    WHERE id = p_rsvp_id;

    -- Check if event has capacity and waitlist
    SELECT capacity INTO v_event_capacity
    FROM public.events
    WHERE id = v_event_id;

    -- If event has capacity, check if we can promote from waitlist
    IF v_event_capacity IS NOT NULL THEN
        -- Count current "going" RSVPs
        SELECT COUNT(*) INTO v_going_count
        FROM public.event_rsvps
        WHERE event_id = v_event_id
            AND status = 'going';

        -- If under capacity, promote first person from waitlist
        IF v_going_count < v_event_capacity THEN
            -- Get the first waitlisted person (FIFO)
            SELECT id, user_id INTO v_first_waitlisted
            FROM public.event_rsvps
            WHERE event_id = v_event_id
                AND status = 'waitlisted'
            ORDER BY waitlist_position ASC
            LIMIT 1;

            IF FOUND THEN
                -- Promote to going
                UPDATE public.event_rsvps
                SET status = 'going',
                    waitlist_position = NULL,
                    updated_at = NOW()
                WHERE id = v_first_waitlisted.id;

                -- Reorder remaining waitlist
                PERFORM reorder_waitlist(v_event_id);

                -- TODO: Send notification to promoted user
            END IF;
        END IF;
    END IF;

    -- Cancel any pending reminders for this user
    PERFORM cancel_event_reminders(v_event_id, v_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for the functions
COMMENT ON FUNCTION get_rsvps_needing_confirmation(UUID) IS 'Returns all "going" RSVPs for an event that need a day-of confirmation ping';
COMMENT ON FUNCTION mark_confirmation_sent(UUID) IS 'Marks that a confirmation ping has been sent to an RSVP';
COMMENT ON FUNCTION confirm_attendance(UUID) IS 'Records that a user confirmed they are still coming';
COMMENT ON FUNCTION bail_out_attendance(UUID, TEXT) IS 'Records that a user bailed out, with optional reason. Auto-promotes from waitlist if applicable.';
