-- Groups Schema
-- Creates tables for groups, group members, and topics
-- Migration: 20260123_groups_schema

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum for group type
CREATE TYPE group_type AS ENUM ('public', 'private');

-- Create enum for member role
CREATE TYPE group_member_role AS ENUM (
    'organizer',
    'co_organizer',
    'assistant_organizer',
    'event_organizer',
    'member'
);

-- Create topics table for curated interest categories
CREATE TABLE IF NOT EXISTS public.topics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    category TEXT, -- Top-level category (Tech, Sports, Arts, etc.)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT topic_name_length CHECK (
        char_length(name) >= 2 AND char_length(name) <= 50
    )
);

-- Create index on topic category for browsing
CREATE INDEX idx_topics_category ON public.topics(category);

-- Create groups table
CREATE TABLE IF NOT EXISTS public.groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Basic information
    name TEXT NOT NULL,
    description TEXT,
    cover_image_url TEXT,

    -- Group settings
    group_type group_type NOT NULL DEFAULT 'public',
    location TEXT, -- City/area for group

    -- Organizer (creator of the group)
    organizer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT group_name_length CHECK (
        char_length(name) >= 3 AND char_length(name) <= 100
    ),
    CONSTRAINT group_description_length CHECK (
        description IS NULL OR char_length(description) <= 2000
    )
);

-- Create indexes for groups
CREATE INDEX idx_groups_organizer_id ON public.groups(organizer_id);
CREATE INDEX idx_groups_created_at ON public.groups(created_at DESC);
CREATE INDEX idx_groups_name ON public.groups(name);
CREATE INDEX idx_groups_group_type ON public.groups(group_type);

-- Create full-text search index on group name and description
CREATE INDEX idx_groups_search ON public.groups USING gin(
    to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, ''))
);

-- Create junction table for group topics
CREATE TABLE IF NOT EXISTS public.group_topics (
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (group_id, topic_id)
);

-- Create indexes for group_topics
CREATE INDEX idx_group_topics_group_id ON public.group_topics(group_id);
CREATE INDEX idx_group_topics_topic_id ON public.group_topics(topic_id);

-- Create group_members junction table
CREATE TABLE IF NOT EXISTS public.group_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role group_member_role NOT NULL DEFAULT 'member',

    -- Join request tracking
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'banned')),
    join_request_message TEXT, -- Optional message when requesting to join private group

    -- Metadata
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    UNIQUE (group_id, user_id)
);

-- Create indexes for group_members
CREATE INDEX idx_group_members_group_id ON public.group_members(group_id);
CREATE INDEX idx_group_members_user_id ON public.group_members(user_id);
CREATE INDEX idx_group_members_role ON public.group_members(role);
CREATE INDEX idx_group_members_status ON public.group_members(status);
CREATE INDEX idx_group_members_joined_at ON public.group_members(joined_at DESC);

-- Enable Row Level Security
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for topics
-- Anyone can read topics (they're curated)
CREATE POLICY "Anyone can read topics"
    ON public.topics
    FOR SELECT
    USING (true);

-- RLS Policies for groups
-- Anyone can read public groups
CREATE POLICY "Anyone can read public groups"
    ON public.groups
    FOR SELECT
    USING (group_type = 'public');

-- Members can read private groups they belong to
CREATE POLICY "Members can read their private groups"
    ON public.groups
    FOR SELECT
    USING (
        group_type = 'private'
        AND EXISTS (
            SELECT 1 FROM public.group_members
            WHERE group_members.group_id = groups.id
            AND group_members.user_id = auth.uid()
            AND group_members.status = 'active'
        )
    );

-- Authenticated users can create groups
CREATE POLICY "Authenticated users can create groups"
    ON public.groups
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = organizer_id);

-- Organizers can update their groups
CREATE POLICY "Organizers can update their groups"
    ON public.groups
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.group_members
            WHERE group_members.group_id = groups.id
            AND group_members.user_id = auth.uid()
            AND group_members.role IN ('organizer', 'co_organizer')
            AND group_members.status = 'active'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.group_members
            WHERE group_members.group_id = groups.id
            AND group_members.user_id = auth.uid()
            AND group_members.role IN ('organizer', 'co_organizer')
            AND group_members.status = 'active'
        )
    );

-- Only organizers can delete groups
CREATE POLICY "Only organizers can delete groups"
    ON public.groups
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.group_members
            WHERE group_members.group_id = groups.id
            AND group_members.user_id = auth.uid()
            AND group_members.role = 'organizer'
            AND group_members.status = 'active'
        )
    );

-- RLS Policies for group_topics
-- Anyone can read topics for public groups
CREATE POLICY "Anyone can read public group topics"
    ON public.group_topics
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.groups
            WHERE groups.id = group_topics.group_id
            AND groups.group_type = 'public'
        )
    );

-- Members can read topics for their private groups
CREATE POLICY "Members can read their private group topics"
    ON public.group_topics
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.group_members
            WHERE group_members.group_id = group_topics.group_id
            AND group_members.user_id = auth.uid()
            AND group_members.status = 'active'
        )
    );

-- Leadership can manage group topics
CREATE POLICY "Leadership can insert group topics"
    ON public.group_topics
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.group_members
            WHERE group_members.group_id = group_topics.group_id
            AND group_members.user_id = auth.uid()
            AND group_members.role IN ('organizer', 'co_organizer')
            AND group_members.status = 'active'
        )
    );

CREATE POLICY "Leadership can delete group topics"
    ON public.group_topics
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.group_members
            WHERE group_members.group_id = group_topics.group_id
            AND group_members.user_id = auth.uid()
            AND group_members.role IN ('organizer', 'co_organizer')
            AND group_members.status = 'active'
        )
    );

-- RLS Policies for group_members
-- Anyone can read members of public groups
CREATE POLICY "Anyone can read public group members"
    ON public.group_members
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.groups
            WHERE groups.id = group_members.group_id
            AND groups.group_type = 'public'
        )
    );

-- Members can read other members of their private groups
CREATE POLICY "Members can read their private group members"
    ON public.group_members
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.group_members AS gm
            WHERE gm.group_id = group_members.group_id
            AND gm.user_id = auth.uid()
            AND gm.status = 'active'
        )
    );

-- Users can read their own membership records
CREATE POLICY "Users can read own membership"
    ON public.group_members
    FOR SELECT
    USING (user_id = auth.uid());

-- Users can join public groups
CREATE POLICY "Users can join public groups"
    ON public.group_members
    FOR INSERT
    WITH CHECK (
        auth.uid() = user_id
        AND role = 'member'
        AND status = 'active'
        AND EXISTS (
            SELECT 1 FROM public.groups
            WHERE groups.id = group_members.group_id
            AND groups.group_type = 'public'
        )
    );

-- Users can request to join private groups
CREATE POLICY "Users can request to join private groups"
    ON public.group_members
    FOR INSERT
    WITH CHECK (
        auth.uid() = user_id
        AND role = 'member'
        AND status = 'pending'
        AND EXISTS (
            SELECT 1 FROM public.groups
            WHERE groups.id = group_members.group_id
            AND groups.group_type = 'private'
        )
    );

-- Leadership can manage member roles and status
CREATE POLICY "Leadership can update member roles"
    ON public.group_members
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.group_members AS gm
            WHERE gm.group_id = group_members.group_id
            AND gm.user_id = auth.uid()
            AND gm.role IN ('organizer', 'co_organizer', 'assistant_organizer')
            AND gm.status = 'active'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.group_members AS gm
            WHERE gm.group_id = group_members.group_id
            AND gm.user_id = auth.uid()
            AND gm.role IN ('organizer', 'co_organizer', 'assistant_organizer')
            AND gm.status = 'active'
        )
    );

-- Members can leave groups (update their own status)
CREATE POLICY "Members can leave groups"
    ON public.group_members
    FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Leadership can remove members
CREATE POLICY "Leadership can remove members"
    ON public.group_members
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.group_members AS gm
            WHERE gm.group_id = group_members.group_id
            AND gm.user_id = auth.uid()
            AND gm.role IN ('organizer', 'co_organizer', 'assistant_organizer')
            AND gm.status = 'active'
        )
    );

-- Users can delete their own pending requests
CREATE POLICY "Users can delete own pending requests"
    ON public.group_members
    FOR DELETE
    USING (user_id = auth.uid() AND status = 'pending');

-- Create trigger to update updated_at on groups
CREATE TRIGGER update_groups_updated_at
    BEFORE UPDATE ON public.groups
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create trigger to update updated_at on topics
CREATE TRIGGER update_topics_updated_at
    BEFORE UPDATE ON public.topics
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create trigger to update updated_at on group_members
CREATE TRIGGER update_group_members_updated_at
    BEFORE UPDATE ON public.group_members
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to automatically add creator as organizer when group is created
CREATE OR REPLACE FUNCTION handle_new_group()
RETURNS TRIGGER AS $$
BEGIN
    -- Add the creator as the organizer of the group
    INSERT INTO public.group_members (group_id, user_id, role, status, joined_at, updated_at)
    VALUES (NEW.id, NEW.organizer_id, 'organizer', 'active', NOW(), NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to add creator as organizer
CREATE TRIGGER on_group_created
    AFTER INSERT ON public.groups
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_group();

-- Create function to ensure at least one organizer exists
CREATE OR REPLACE FUNCTION ensure_organizer_exists()
RETURNS TRIGGER AS $$
DECLARE
    organizer_count INTEGER;
BEGIN
    -- If updating or deleting an organizer role, check if others exist
    IF (TG_OP = 'UPDATE' AND OLD.role = 'organizer' AND NEW.role != 'organizer') OR
       (TG_OP = 'DELETE' AND OLD.role = 'organizer') THEN

        SELECT COUNT(*) INTO organizer_count
        FROM public.group_members
        WHERE group_id = COALESCE(NEW.group_id, OLD.group_id)
        AND role = 'organizer'
        AND status = 'active'
        AND id != COALESCE(OLD.id, NEW.id);

        IF organizer_count = 0 THEN
            RAISE EXCEPTION 'Cannot remove the last organizer from a group';
        END IF;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce organizer constraint
CREATE TRIGGER enforce_organizer_constraint
    BEFORE UPDATE OR DELETE ON public.group_members
    FOR EACH ROW
    EXECUTE FUNCTION ensure_organizer_exists();

-- Insert some default topics
INSERT INTO public.topics (name, slug, category) VALUES
    -- Tech & Innovation
    ('Software Development', 'software-development', 'Tech'),
    ('Web Development', 'web-development', 'Tech'),
    ('Data Science', 'data-science', 'Tech'),
    ('AI & Machine Learning', 'ai-machine-learning', 'Tech'),
    ('Cybersecurity', 'cybersecurity', 'Tech'),

    -- Sports & Fitness
    ('Running', 'running', 'Sports'),
    ('Cycling', 'cycling', 'Sports'),
    ('Hiking', 'hiking', 'Sports'),
    ('Yoga', 'yoga', 'Sports'),
    ('Basketball', 'basketball', 'Sports'),
    ('Soccer', 'soccer', 'Sports'),

    -- Arts & Culture
    ('Photography', 'photography', 'Arts'),
    ('Music', 'music', 'Arts'),
    ('Writing', 'writing', 'Arts'),
    ('Film & Movies', 'film-movies', 'Arts'),
    ('Theater', 'theater', 'Arts'),

    -- Social & Hobbies
    ('Book Clubs', 'book-clubs', 'Social'),
    ('Board Games', 'board-games', 'Social'),
    ('Food & Dining', 'food-dining', 'Social'),
    ('Language Exchange', 'language-exchange', 'Social'),
    ('Travel', 'travel', 'Social'),

    -- Career & Professional
    ('Entrepreneurship', 'entrepreneurship', 'Career'),
    ('Marketing', 'marketing', 'Career'),
    ('Leadership', 'leadership', 'Career'),
    ('Finance', 'finance', 'Career')
ON CONFLICT (slug) DO NOTHING;

-- Add helpful comments
COMMENT ON TABLE public.groups IS 'Community groups that organize events';
COMMENT ON COLUMN public.groups.id IS 'Unique group identifier';
COMMENT ON COLUMN public.groups.name IS 'Group name (3-100 chars)';
COMMENT ON COLUMN public.groups.description IS 'Group description (max 2000 chars)';
COMMENT ON COLUMN public.groups.group_type IS 'Public (anyone can join) or Private (requires approval)';
COMMENT ON COLUMN public.groups.organizer_id IS 'User who created the group';

COMMENT ON TABLE public.topics IS 'Curated list of interest categories';
COMMENT ON COLUMN public.topics.name IS 'Display name of the topic';
COMMENT ON COLUMN public.topics.slug IS 'URL-friendly identifier';
COMMENT ON COLUMN public.topics.category IS 'Top-level category for grouping';

COMMENT ON TABLE public.group_topics IS 'Junction table linking groups to topics';

COMMENT ON TABLE public.group_members IS 'Group membership and roles';
COMMENT ON COLUMN public.group_members.role IS 'Member role and permissions level';
COMMENT ON COLUMN public.group_members.status IS 'active, pending (join request), or banned';
