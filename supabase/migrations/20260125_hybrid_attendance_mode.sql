-- Hybrid Event Attendance Mode
-- Adds attendance_mode field to event_rsvps for hybrid events
-- Migration: 20260125_hybrid_attendance_mode

-- Create enum for attendance mode
CREATE TYPE attendance_mode AS ENUM ('in_person', 'online');

-- Add attendance_mode column to event_rsvps
ALTER TABLE public.event_rsvps
ADD COLUMN attendance_mode attendance_mode;

-- Add comment for the new column
COMMENT ON COLUMN public.event_rsvps.attendance_mode IS 'Attendance mode for hybrid events: in_person or online. NULL for non-hybrid events or when status is not going/interested.';

-- Create index for attendance mode queries
CREATE INDEX idx_event_rsvps_attendance_mode ON public.event_rsvps(attendance_mode);
