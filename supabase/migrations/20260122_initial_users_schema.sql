-- Initial Users Schema
-- Creates user profile table with RLS policies
-- Migration: 20260122_initial_users_schema

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum for profile visibility
CREATE TYPE profile_visibility AS ENUM ('public', 'members_only', 'connections_only');

-- Create users table (extends Supabase auth.users)
-- This table stores user profile data separate from authentication data
CREATE TABLE IF NOT EXISTS public.users (
    -- Primary key: references Supabase auth.users id
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Profile information
    display_name TEXT,
    bio TEXT CHECK (char_length(bio) <= 500),
    profile_photo_url TEXT,
    location TEXT,

    -- Privacy settings
    profile_visibility profile_visibility NOT NULL DEFAULT 'members_only',

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT display_name_length CHECK (
        display_name IS NULL OR
        (char_length(display_name) >= 2 AND char_length(display_name) <= 50)
    )
);

-- Create index on display_name for search
CREATE INDEX idx_users_display_name ON public.users(display_name);

-- Create index on created_at for sorting
CREATE INDEX idx_users_created_at ON public.users(created_at);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can read their own profile
CREATE POLICY "Users can read own profile"
    ON public.users
    FOR SELECT
    USING (auth.uid() = id);

-- RLS Policy: Users can read public profiles
CREATE POLICY "Anyone can read public profiles"
    ON public.users
    FOR SELECT
    USING (profile_visibility = 'public');

-- RLS Policy: Authenticated users can read members_only profiles
CREATE POLICY "Authenticated users can read members_only profiles"
    ON public.users
    FOR SELECT
    USING (
        profile_visibility = 'members_only'
        AND auth.role() = 'authenticated'
    );

-- RLS Policy: Users can update their own profile
CREATE POLICY "Users can update own profile"
    ON public.users
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- RLS Policy: Users can insert their own profile
CREATE POLICY "Users can insert own profile"
    ON public.users
    FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update updated_at on row update
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, display_name, created_at, updated_at)
    VALUES (
        NEW.id,
        -- Use email local part as initial display name
        COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
        NOW(),
        NOW()
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create profile on user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- Add helpful comments
COMMENT ON TABLE public.users IS 'User profile data extending Supabase auth.users';
COMMENT ON COLUMN public.users.id IS 'References auth.users(id) - unique user identifier';
COMMENT ON COLUMN public.users.display_name IS 'User visible name (2-50 chars)';
COMMENT ON COLUMN public.users.bio IS 'User bio/about section (max 500 chars)';
COMMENT ON COLUMN public.users.profile_photo_url IS 'URL to profile photo in Supabase Storage';
COMMENT ON COLUMN public.users.location IS 'User city/area for recommendations';
COMMENT ON COLUMN public.users.profile_visibility IS 'Who can view this profile';
