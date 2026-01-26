-- Event Size Indicators
-- Adds event size category for improved accessibility and discovery
-- Migration: 20260126_event_size_indicators

-- Create enum for event size categories
-- Based on spec: Intimate (<10), Small (10-20), Medium (20-50), Large (50+)
CREATE TYPE event_size AS ENUM (
    'intimate',  -- under 10 people
    'small',     -- 10-20 people
    'medium',    -- 20-50 people
    'large'      -- 50+ people
);

-- Add event size column to events table
-- Can be manually set or auto-calculated from capacity
ALTER TABLE public.events
ADD COLUMN event_size event_size DEFAULT NULL;

-- Create index for filtering by event size
CREATE INDEX idx_events_size ON public.events(event_size) WHERE event_size IS NOT NULL;

-- Add helpful comment
COMMENT ON COLUMN public.events.event_size IS 'Event size category (intimate, small, medium, large) - auto-calculated from capacity or manually set';
