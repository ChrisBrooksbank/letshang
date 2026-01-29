-- Combined Migration Script for letshang
-- Run this in Supabase Dashboard > SQL Editor
-- This includes: users, events, rsvps, groups, topics

-- ============================================
-- PART 1: Initial Users Schema
-- ============================================

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum for profile visibility
DO $$ BEGIN
    CREATE TYPE profile_visibility AS ENUM ('public', 'members_only', 'connections_only');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    bio TEXT CHECK (char_length(bio) <= 500),
    profile_photo_url TEXT,
    location TEXT,
    profile_visibility profile_visibility NOT NULL DEFAULT 'members_only',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT display_name_length CHECK (
        display_name IS NULL OR
        (char_length(display_name) >= 2 AND char_length(display_name) <= 50)
    )
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_display_name ON public.users(display_name);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON public.users(created_at);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users
DROP POLICY IF EXISTS "Users can read own profile" ON public.users;
CREATE POLICY "Users can read own profile"
    ON public.users FOR SELECT
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Anyone can read public profiles" ON public.users;
CREATE POLICY "Anyone can read public profiles"
    ON public.users FOR SELECT
    USING (profile_visibility = 'public');

DROP POLICY IF EXISTS "Authenticated users can read members_only profiles" ON public.users;
CREATE POLICY "Authenticated users can read members_only profiles"
    ON public.users FOR SELECT
    USING (profile_visibility = 'members_only' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile"
    ON public.users FOR UPDATE
    USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
CREATE POLICY "Users can insert own profile"
    ON public.users FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Create function to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for users
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
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
        COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for auto profile creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- ============================================
-- PART 2: Events Schema
-- ============================================

-- Create enums for events
DO $$ BEGIN
    CREATE TYPE event_type AS ENUM ('in_person', 'online', 'hybrid');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE event_visibility AS ENUM ('public', 'group_only', 'hidden');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create events table
CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    group_id UUID DEFAULT NULL,
    title TEXT NOT NULL CHECK (char_length(title) >= 5 AND char_length(title) <= 100),
    description TEXT NOT NULL CHECK (char_length(description) <= 5000),
    event_type event_type NOT NULL,
    visibility event_visibility NOT NULL DEFAULT 'public',
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    duration_minutes INTEGER,
    venue_name TEXT,
    venue_address TEXT,
    venue_lat DECIMAL(10, 8),
    venue_lng DECIMAL(11, 8),
    video_link TEXT,
    capacity INTEGER CHECK (capacity IS NULL OR (capacity >= 1 AND capacity <= 10000)),
    cover_image_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT end_time_after_start CHECK (end_time IS NULL OR end_time > start_time),
    CONSTRAINT duration_positive CHECK (duration_minutes IS NULL OR duration_minutes > 0)
);

-- Create indexes for events
CREATE INDEX IF NOT EXISTS idx_events_creator_id ON public.events(creator_id);
CREATE INDEX IF NOT EXISTS idx_events_group_id ON public.events(group_id) WHERE group_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_start_time ON public.events(start_time);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON public.events(created_at);
CREATE INDEX IF NOT EXISTS idx_events_event_type ON public.events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_visibility ON public.events(visibility);
CREATE INDEX IF NOT EXISTS idx_events_visibility_start_time ON public.events(visibility, start_time);

-- Enable RLS on events
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for events
DROP POLICY IF EXISTS "Anyone can read public events" ON public.events;
CREATE POLICY "Anyone can read public events"
    ON public.events FOR SELECT
    USING (visibility = 'public');

DROP POLICY IF EXISTS "Creators can read own events" ON public.events;
CREATE POLICY "Creators can read own events"
    ON public.events FOR SELECT
    USING (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Creators can update own events" ON public.events;
CREATE POLICY "Creators can update own events"
    ON public.events FOR UPDATE
    USING (auth.uid() = creator_id) WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Creators can delete own events" ON public.events;
CREATE POLICY "Creators can delete own events"
    ON public.events FOR DELETE
    USING (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Authenticated users can create events" ON public.events;
CREATE POLICY "Authenticated users can create events"
    ON public.events FOR INSERT
    WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = creator_id);

-- Trigger for events
DROP TRIGGER IF EXISTS update_events_updated_at ON public.events;
CREATE TRIGGER update_events_updated_at
    BEFORE UPDATE ON public.events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- PART 3: RSVP Schema
-- ============================================

DO $$ BEGIN
    CREATE TYPE rsvp_status AS ENUM ('going', 'interested', 'not_going');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.event_rsvps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    status rsvp_status NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_rsvp_per_user_per_event UNIQUE (event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_event_rsvps_event_id ON public.event_rsvps(event_id);
CREATE INDEX IF NOT EXISTS idx_event_rsvps_user_id ON public.event_rsvps(user_id);
CREATE INDEX IF NOT EXISTS idx_event_rsvps_status ON public.event_rsvps(status);
CREATE INDEX IF NOT EXISTS idx_event_rsvps_event_status ON public.event_rsvps(event_id, status);

ALTER TABLE public.event_rsvps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own RSVPs" ON public.event_rsvps;
CREATE POLICY "Users can read own RSVPs"
    ON public.event_rsvps FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "RSVPed users can see other attendees" ON public.event_rsvps;
CREATE POLICY "RSVPed users can see other attendees"
    ON public.event_rsvps FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.event_rsvps WHERE event_id = event_rsvps.event_id AND user_id = auth.uid()));

DROP POLICY IF EXISTS "Event creators can see all RSVPs" ON public.event_rsvps;
CREATE POLICY "Event creators can see all RSVPs"
    ON public.event_rsvps FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.events WHERE id = event_rsvps.event_id AND creator_id = auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can create RSVPs" ON public.event_rsvps;
CREATE POLICY "Authenticated users can create RSVPs"
    ON public.event_rsvps FOR INSERT
    WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own RSVPs" ON public.event_rsvps;
CREATE POLICY "Users can update own RSVPs"
    ON public.event_rsvps FOR UPDATE
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own RSVPs" ON public.event_rsvps;
CREATE POLICY "Users can delete own RSVPs"
    ON public.event_rsvps FOR DELETE
    USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_event_rsvps_updated_at ON public.event_rsvps;
CREATE TRIGGER update_event_rsvps_updated_at
    BEFORE UPDATE ON public.event_rsvps
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- PART 4: Groups & Topics Schema
-- ============================================

DO $$ BEGIN
    CREATE TYPE group_type AS ENUM ('public', 'private');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE group_member_role AS ENUM ('organizer', 'co_organizer', 'assistant_organizer', 'event_organizer', 'member');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Topics table
CREATE TABLE IF NOT EXISTS public.topics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    category TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT topic_name_length CHECK (char_length(name) >= 2 AND char_length(name) <= 50)
);

CREATE INDEX IF NOT EXISTS idx_topics_category ON public.topics(category);

-- Groups table
CREATE TABLE IF NOT EXISTS public.groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    cover_image_url TEXT,
    group_type group_type NOT NULL DEFAULT 'public',
    location TEXT,
    organizer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT group_name_length CHECK (char_length(name) >= 3 AND char_length(name) <= 100),
    CONSTRAINT group_description_length CHECK (description IS NULL OR char_length(description) <= 2000)
);

CREATE INDEX IF NOT EXISTS idx_groups_organizer_id ON public.groups(organizer_id);
CREATE INDEX IF NOT EXISTS idx_groups_created_at ON public.groups(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_groups_name ON public.groups(name);
CREATE INDEX IF NOT EXISTS idx_groups_group_type ON public.groups(group_type);

-- Group topics junction
CREATE TABLE IF NOT EXISTS public.group_topics (
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (group_id, topic_id)
);

CREATE INDEX IF NOT EXISTS idx_group_topics_group_id ON public.group_topics(group_id);
CREATE INDEX IF NOT EXISTS idx_group_topics_topic_id ON public.group_topics(topic_id);

-- Group members table
CREATE TABLE IF NOT EXISTS public.group_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role group_member_role NOT NULL DEFAULT 'member',
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'banned')),
    join_request_message TEXT,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON public.group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON public.group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_role ON public.group_members(role);
CREATE INDEX IF NOT EXISTS idx_group_members_status ON public.group_members(status);

-- Enable RLS
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- Topics RLS
DROP POLICY IF EXISTS "Anyone can read topics" ON public.topics;
CREATE POLICY "Anyone can read topics"
    ON public.topics FOR SELECT
    USING (true);

-- Groups RLS
DROP POLICY IF EXISTS "Anyone can read public groups" ON public.groups;
CREATE POLICY "Anyone can read public groups"
    ON public.groups FOR SELECT
    USING (group_type = 'public');

DROP POLICY IF EXISTS "Members can read their private groups" ON public.groups;
CREATE POLICY "Members can read their private groups"
    ON public.groups FOR SELECT
    USING (
        group_type = 'private'
        AND EXISTS (
            SELECT 1 FROM public.group_members
            WHERE group_members.group_id = groups.id
            AND group_members.user_id = auth.uid()
            AND group_members.status = 'active'
        )
    );

DROP POLICY IF EXISTS "Authenticated users can create groups" ON public.groups;
CREATE POLICY "Authenticated users can create groups"
    ON public.groups FOR INSERT
    WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = organizer_id);

DROP POLICY IF EXISTS "Organizers can update their groups" ON public.groups;
CREATE POLICY "Organizers can update their groups"
    ON public.groups FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.group_members
            WHERE group_members.group_id = groups.id
            AND group_members.user_id = auth.uid()
            AND group_members.role IN ('organizer', 'co_organizer')
            AND group_members.status = 'active'
        )
    );

-- Group topics RLS
DROP POLICY IF EXISTS "Anyone can read public group topics" ON public.group_topics;
CREATE POLICY "Anyone can read public group topics"
    ON public.group_topics FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.groups WHERE groups.id = group_topics.group_id AND groups.group_type = 'public'));

DROP POLICY IF EXISTS "Members can read their private group topics" ON public.group_topics;
CREATE POLICY "Members can read their private group topics"
    ON public.group_topics FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.group_members WHERE group_members.group_id = group_topics.group_id AND group_members.user_id = auth.uid() AND group_members.status = 'active'));

-- Group members RLS
DROP POLICY IF EXISTS "Anyone can read public group members" ON public.group_members;
CREATE POLICY "Anyone can read public group members"
    ON public.group_members FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.groups WHERE groups.id = group_members.group_id AND groups.group_type = 'public'));

DROP POLICY IF EXISTS "Members can read their private group members" ON public.group_members;
CREATE POLICY "Members can read their private group members"
    ON public.group_members FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.group_members AS gm WHERE gm.group_id = group_members.group_id AND gm.user_id = auth.uid() AND gm.status = 'active'));

DROP POLICY IF EXISTS "Users can read own membership" ON public.group_members;
CREATE POLICY "Users can read own membership"
    ON public.group_members FOR SELECT
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can join public groups" ON public.group_members;
CREATE POLICY "Users can join public groups"
    ON public.group_members FOR INSERT
    WITH CHECK (
        auth.uid() = user_id AND role = 'member' AND status = 'active'
        AND EXISTS (SELECT 1 FROM public.groups WHERE groups.id = group_members.group_id AND groups.group_type = 'public')
    );

DROP POLICY IF EXISTS "Members can leave groups" ON public.group_members;
CREATE POLICY "Members can leave groups"
    ON public.group_members FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own pending requests" ON public.group_members;
CREATE POLICY "Users can delete own pending requests"
    ON public.group_members FOR DELETE
    USING (user_id = auth.uid() AND status = 'pending');

-- Triggers
DROP TRIGGER IF EXISTS update_groups_updated_at ON public.groups;
CREATE TRIGGER update_groups_updated_at
    BEFORE UPDATE ON public.groups
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_topics_updated_at ON public.topics;
CREATE TRIGGER update_topics_updated_at
    BEFORE UPDATE ON public.topics
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_group_members_updated_at ON public.group_members;
CREATE TRIGGER update_group_members_updated_at
    BEFORE UPDATE ON public.group_members
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to add creator as organizer
CREATE OR REPLACE FUNCTION handle_new_group()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.group_members (group_id, user_id, role, status, joined_at, updated_at)
    VALUES (NEW.id, NEW.organizer_id, 'organizer', 'active', NOW(), NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_group_created ON public.groups;
CREATE TRIGGER on_group_created
    AFTER INSERT ON public.groups
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_group();

-- Insert default topics
INSERT INTO public.topics (name, slug, category) VALUES
    ('Software Development', 'software-development', 'Tech'),
    ('Web Development', 'web-development', 'Tech'),
    ('Data Science', 'data-science', 'Tech'),
    ('AI & Machine Learning', 'ai-machine-learning', 'Tech'),
    ('Cybersecurity', 'cybersecurity', 'Tech'),
    ('Running', 'running', 'Sports'),
    ('Cycling', 'cycling', 'Sports'),
    ('Hiking', 'hiking', 'Sports'),
    ('Yoga', 'yoga', 'Sports'),
    ('Basketball', 'basketball', 'Sports'),
    ('Soccer', 'soccer', 'Sports'),
    ('Photography', 'photography', 'Arts'),
    ('Music', 'music', 'Arts'),
    ('Writing', 'writing', 'Arts'),
    ('Film & Movies', 'film-movies', 'Arts'),
    ('Theater', 'theater', 'Arts'),
    ('Book Clubs', 'book-clubs', 'Social'),
    ('Board Games', 'board-games', 'Social'),
    ('Food & Dining', 'food-dining', 'Social'),
    ('Language Exchange', 'language-exchange', 'Social'),
    ('Travel', 'travel', 'Social'),
    ('Entrepreneurship', 'entrepreneurship', 'Career'),
    ('Marketing', 'marketing', 'Career'),
    ('Leadership', 'leadership', 'Career'),
    ('Finance', 'finance', 'Career')
ON CONFLICT (slug) DO NOTHING;

-- Done!
-- After running this, refresh your browser and test /categories
