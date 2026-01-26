-- Event Format Tags
-- Adds format tags and accessibility indicators to events
-- Migration: 20260126_event_format_tags

-- Create enum for event format tags
CREATE TYPE event_format_tag AS ENUM (
    'speaker',
    'workshop',
    'activity',
    'discussion',
    'mixer',
    'hangout'
);

-- Create enum for accessibility indicators
CREATE TYPE event_accessibility_tag AS ENUM (
    'first_timer_friendly',
    'structured_activity',
    'low_pressure',
    'beginner_welcome'
);

-- Add format tags array column to events table
ALTER TABLE public.events
ADD COLUMN format_tags event_format_tag[] DEFAULT ARRAY[]::event_format_tag[] NOT NULL;

-- Add accessibility tags array column to events table
ALTER TABLE public.events
ADD COLUMN accessibility_tags event_accessibility_tag[] DEFAULT ARRAY[]::event_accessibility_tag[] NOT NULL;

-- Create index for filtering by format tags
CREATE INDEX idx_events_format_tags ON public.events USING GIN(format_tags);

-- Create index for filtering by accessibility tags
CREATE INDEX idx_events_accessibility_tags ON public.events USING GIN(accessibility_tags);

-- Add helpful comments
COMMENT ON COLUMN public.events.format_tags IS 'Event format tags (speaker, workshop, activity, etc.) - multiple allowed';
COMMENT ON COLUMN public.events.accessibility_tags IS 'Accessibility indicators (first-timer friendly, structured, etc.) - multiple allowed';
