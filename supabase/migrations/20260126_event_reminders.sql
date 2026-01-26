-- Event Reminders Schema
-- Creates event_reminders table for automated reminder scheduling
-- Migration: 20260126_event_reminders

-- Create enum for reminder types
CREATE TYPE reminder_type AS ENUM ('seven_days', 'two_days', 'day_of');

-- Create enum for delivery status
CREATE TYPE delivery_status AS ENUM ('scheduled', 'sent', 'failed', 'cancelled');

-- Create event_reminders table
-- This table tracks all scheduled reminders for events
CREATE TABLE IF NOT EXISTS public.event_reminders (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Foreign keys
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

    -- Reminder configuration
    reminder_type reminder_type NOT NULL,
    scheduled_for TIMESTAMPTZ NOT NULL,

    -- Delivery tracking
    status delivery_status NOT NULL DEFAULT 'scheduled',
    sent_at TIMESTAMPTZ,
    error_message TEXT,

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    -- One reminder of each type per user per event
    CONSTRAINT unique_reminder_per_user_per_event_per_type UNIQUE (event_id, user_id, reminder_type),
    -- Scheduled time must be in the past of event start time
    CONSTRAINT scheduled_before_event CHECK (
        scheduled_for < (SELECT start_time FROM public.events WHERE id = event_id)
    )
);

-- Create indexes for common queries
CREATE INDEX idx_event_reminders_event_id ON public.event_reminders(event_id);
CREATE INDEX idx_event_reminders_user_id ON public.event_reminders(user_id);
CREATE INDEX idx_event_reminders_scheduled_for ON public.event_reminders(scheduled_for);
CREATE INDEX idx_event_reminders_status ON public.event_reminders(status);

-- Create composite index for reminder processing queries
-- Find all scheduled reminders that need to be sent now
CREATE INDEX idx_event_reminders_status_scheduled_for
    ON public.event_reminders(status, scheduled_for)
    WHERE status = 'scheduled';

-- Enable Row Level Security
ALTER TABLE public.event_reminders ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can read their own reminders
CREATE POLICY "Users can read own reminders"
    ON public.event_reminders
    FOR SELECT
    USING (auth.uid() = user_id);

-- RLS Policy: Event creators can see all reminders for their events
CREATE POLICY "Event creators can see event reminders"
    ON public.event_reminders
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.events
            WHERE id = event_reminders.event_id
            AND creator_id = auth.uid()
        )
    );

-- RLS Policy: Only system can insert reminders (via trigger)
-- Users cannot manually create reminders
CREATE POLICY "System can insert reminders"
    ON public.event_reminders
    FOR INSERT
    WITH CHECK (false); -- Effectively blocks user inserts; use service role

-- RLS Policy: Only system can update reminders
CREATE POLICY "System can update reminders"
    ON public.event_reminders
    FOR UPDATE
    USING (false)
    WITH CHECK (false); -- Effectively blocks user updates; use service role

-- RLS Policy: Users can cancel their own reminders
CREATE POLICY "Users can delete own reminders"
    ON public.event_reminders
    FOR DELETE
    USING (auth.uid() = user_id);

-- Create trigger to update updated_at on row update
CREATE TRIGGER update_event_reminders_updated_at
    BEFORE UPDATE ON public.event_reminders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate reminder schedule times
CREATE OR REPLACE FUNCTION calculate_reminder_times(event_start TIMESTAMPTZ)
RETURNS TABLE (
    reminder_type reminder_type,
    scheduled_for TIMESTAMPTZ
) AS $$
BEGIN
    -- 7 days before (at 9am local time)
    -- For simplicity, using event start time zone
    IF event_start > NOW() + INTERVAL '7 days' THEN
        RETURN QUERY SELECT
            'seven_days'::reminder_type,
            (event_start - INTERVAL '7 days')::date + TIME '09:00:00';
    END IF;

    -- 2 days before (at 9am local time)
    IF event_start > NOW() + INTERVAL '2 days' THEN
        RETURN QUERY SELECT
            'two_days'::reminder_type,
            (event_start - INTERVAL '2 days')::date + TIME '09:00:00';
    END IF;

    -- Day of (at 9am local time, or 1 hour before if event is earlier)
    IF event_start > NOW() THEN
        RETURN QUERY SELECT
            'day_of'::reminder_type,
            CASE
                WHEN EXTRACT(HOUR FROM event_start) > 10 THEN
                    event_start::date + TIME '09:00:00'
                ELSE
                    event_start - INTERVAL '1 hour'
            END;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to schedule reminders for a user's RSVP
-- Called when user RSVPs as "going" or "interested"
CREATE OR REPLACE FUNCTION schedule_event_reminders(
    p_event_id UUID,
    p_user_id UUID
)
RETURNS void AS $$
DECLARE
    v_event_start TIMESTAMPTZ;
    v_reminder RECORD;
BEGIN
    -- Get event start time
    SELECT start_time INTO v_event_start
    FROM public.events
    WHERE id = p_event_id;

    -- Don't schedule reminders for past events
    IF v_event_start <= NOW() THEN
        RETURN;
    END IF;

    -- Insert reminders for each calculated time
    FOR v_reminder IN
        SELECT * FROM calculate_reminder_times(v_event_start)
    LOOP
        INSERT INTO public.event_reminders (
            event_id,
            user_id,
            reminder_type,
            scheduled_for,
            status
        ) VALUES (
            p_event_id,
            p_user_id,
            v_reminder.reminder_type,
            v_reminder.scheduled_for,
            'scheduled'
        )
        ON CONFLICT (event_id, user_id, reminder_type) DO NOTHING;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cancel all reminders for a user's RSVP
-- Called when user changes RSVP to "not_going" or cancels RSVP
CREATE OR REPLACE FUNCTION cancel_event_reminders(
    p_event_id UUID,
    p_user_id UUID
)
RETURNS void AS $$
BEGIN
    UPDATE public.event_reminders
    SET status = 'cancelled',
        updated_at = NOW()
    WHERE event_id = p_event_id
        AND user_id = p_user_id
        AND status = 'scheduled';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically schedule reminders on RSVP insert
CREATE OR REPLACE FUNCTION handle_rsvp_reminders()
RETURNS TRIGGER AS $$
BEGIN
    -- Schedule reminders for "going" and "interested" RSVPs
    IF NEW.status IN ('going', 'interested') THEN
        PERFORM schedule_event_reminders(NEW.event_id, NEW.user_id);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically update reminders on RSVP status change
CREATE OR REPLACE FUNCTION handle_rsvp_reminder_updates()
RETURNS TRIGGER AS $$
BEGIN
    -- If changing from going/interested to not_going, cancel reminders
    IF OLD.status IN ('going', 'interested') AND NEW.status = 'not_going' THEN
        PERFORM cancel_event_reminders(NEW.event_id, NEW.user_id);

    -- If changing from not_going to going/interested, schedule reminders
    ELSIF OLD.status = 'not_going' AND NEW.status IN ('going', 'interested') THEN
        PERFORM schedule_event_reminders(NEW.event_id, NEW.user_id);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers on event_rsvps table
CREATE TRIGGER schedule_reminders_on_rsvp_insert
    AFTER INSERT ON public.event_rsvps
    FOR EACH ROW
    EXECUTE FUNCTION handle_rsvp_reminders();

CREATE TRIGGER update_reminders_on_rsvp_update
    AFTER UPDATE ON public.event_rsvps
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION handle_rsvp_reminder_updates();

-- Add helpful comments
COMMENT ON TABLE public.event_reminders IS 'Scheduled reminders for event attendees';
COMMENT ON COLUMN public.event_reminders.id IS 'Unique reminder identifier';
COMMENT ON COLUMN public.event_reminders.event_id IS 'Event being reminded about';
COMMENT ON COLUMN public.event_reminders.user_id IS 'User receiving the reminder';
COMMENT ON COLUMN public.event_reminders.reminder_type IS 'Type: seven_days, two_days, or day_of';
COMMENT ON COLUMN public.event_reminders.scheduled_for IS 'When the reminder should be sent';
COMMENT ON COLUMN public.event_reminders.status IS 'Delivery status: scheduled, sent, failed, or cancelled';
COMMENT ON COLUMN public.event_reminders.sent_at IS 'When the reminder was actually sent';
COMMENT ON COLUMN public.event_reminders.error_message IS 'Error details if delivery failed';
COMMENT ON FUNCTION schedule_event_reminders IS 'Schedule reminders for a user RSVP (going/interested)';
COMMENT ON FUNCTION cancel_event_reminders IS 'Cancel all scheduled reminders for a user RSVP';
COMMENT ON FUNCTION calculate_reminder_times IS 'Calculate when reminders should be sent for an event';
