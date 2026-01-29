-- Add missing columns to events and users tables
-- Run this in Supabase Dashboard > SQL Editor

-- Create enum for event format tags
DO $$ BEGIN
    CREATE TYPE event_format_tag AS ENUM (
        'speaker',
        'workshop',
        'activity',
        'discussion',
        'mixer',
        'hangout'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create enum for accessibility indicators
DO $$ BEGIN
    CREATE TYPE event_accessibility_tag AS ENUM (
        'first_timer_friendly',
        'structured_activity',
        'low_pressure',
        'beginner_welcome'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create enum for event size categories
DO $$ BEGIN
    CREATE TYPE event_size AS ENUM (
        'intimate',
        'small',
        'medium',
        'large'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add columns to events table (ignore if already exists)
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS format_tags event_format_tag[] DEFAULT ARRAY[]::event_format_tag[];

ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS accessibility_tags event_accessibility_tag[] DEFAULT ARRAY[]::event_accessibility_tag[];

ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS event_size event_size DEFAULT NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_events_format_tags ON public.events USING GIN(format_tags);
CREATE INDEX IF NOT EXISTS idx_events_accessibility_tags ON public.events USING GIN(accessibility_tags);
CREATE INDEX IF NOT EXISTS idx_events_size ON public.events(event_size) WHERE event_size IS NOT NULL;

-- ============================================
-- USER LOCATION COLUMNS
-- ============================================

-- Add latitude and longitude columns to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS location_lat DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS location_lng DOUBLE PRECISION;

-- Add constraints (ignore errors if already exist)
DO $$ BEGIN
    ALTER TABLE public.users
    ADD CONSTRAINT location_lat_range CHECK (location_lat IS NULL OR (location_lat >= -90 AND location_lat <= 90));
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE public.users
    ADD CONSTRAINT location_lng_range CHECK (location_lng IS NULL OR (location_lng >= -180 AND location_lng <= 180));
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_location_lat ON public.users(location_lat) WHERE location_lat IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_location_lng ON public.users(location_lng) WHERE location_lng IS NOT NULL;

-- Done! Now try creating an event or updating your profile again.
