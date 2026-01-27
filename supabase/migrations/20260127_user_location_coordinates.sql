-- User Location Coordinates
-- Adds lat/lng fields to users table for geocoded location storage
-- Migration: 20260127_user_location_coordinates

-- Add latitude and longitude columns to users table
-- These will be populated when users set their location
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS location_lat DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS location_lng DOUBLE PRECISION;

-- Add constraints to ensure valid coordinates
ALTER TABLE public.users
ADD CONSTRAINT location_lat_range CHECK (location_lat IS NULL OR (location_lat >= -90 AND location_lat <= 90)),
ADD CONSTRAINT location_lng_range CHECK (location_lng IS NULL OR (location_lng >= -180 AND location_lng <= 180));

-- Create index for location-based queries
-- Uses btree index for range queries (distance filtering)
CREATE INDEX IF NOT EXISTS idx_users_location_lat ON public.users(location_lat) WHERE location_lat IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_location_lng ON public.users(location_lng) WHERE location_lng IS NOT NULL;

-- Add comment to explain the fields
COMMENT ON COLUMN public.users.location_lat IS 'Latitude of user''s saved location (geocoded from location text field)';
COMMENT ON COLUMN public.users.location_lng IS 'Longitude of user''s saved location (geocoded from location text field)';
