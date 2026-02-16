-- =============================================================================
-- LetsHang - Consolidated Database Schema
-- =============================================================================
-- Generated: 2026-02-16
-- Description: Single consolidated SQL script representing the final schema
--              state from 28 incremental migrations (20260122 - 20260128).
--
-- Usage:
--   - For a FRESH database: Paste into Supabase Dashboard > SQL Editor and run.
--   - For an EXISTING database (already ran all 28 migrations): No action needed.
--     This file serves as the canonical schema reference.
--
-- Organization:
--   1. Extensions
--   2. Enum Types
--   3. Utility Functions
--   4. Tables (with final merged columns)
--   5. Indexes
--   6. Row Level Security (RLS)
--   7. Triggers
--   8. Business Logic Functions
--   9. Grants
--  10. Seed Data
-- =============================================================================


-- =============================================================================
-- 1. EXTENSIONS
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- =============================================================================
-- 2. ENUM TYPES
-- =============================================================================

-- Profile visibility
DO $$ BEGIN
    CREATE TYPE profile_visibility AS ENUM ('public', 'members_only', 'connections_only');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Event type
DO $$ BEGIN
    CREATE TYPE event_type AS ENUM ('in_person', 'online', 'hybrid');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Event visibility
DO $$ BEGIN
    CREATE TYPE event_visibility AS ENUM ('public', 'group_only', 'hidden');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- RSVP status (includes 'waitlisted' which was added via ALTER TYPE)
DO $$ BEGIN
    CREATE TYPE rsvp_status AS ENUM ('going', 'interested', 'not_going', 'waitlisted');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Attendance mode for hybrid events
DO $$ BEGIN
    CREATE TYPE attendance_mode AS ENUM ('in_person', 'online');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Event format tags
DO $$ BEGIN
    CREATE TYPE event_format_tag AS ENUM (
        'speaker', 'workshop', 'activity', 'discussion', 'mixer', 'hangout'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Event accessibility tags
DO $$ BEGIN
    CREATE TYPE event_accessibility_tag AS ENUM (
        'first_timer_friendly', 'structured_activity', 'low_pressure', 'beginner_welcome'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Event size categories
DO $$ BEGIN
    CREATE TYPE event_size AS ENUM ('intimate', 'small', 'medium', 'large');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Group type
DO $$ BEGIN
    CREATE TYPE group_type AS ENUM ('public', 'private');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Group member role
DO $$ BEGIN
    CREATE TYPE group_member_role AS ENUM (
        'organizer', 'co_organizer', 'assistant_organizer', 'event_organizer', 'member'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Group member action type
DO $$ BEGIN
    CREATE TYPE group_member_action_type AS ENUM (
        'removed', 'banned', 'unbanned', 'role_changed'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Reminder type
DO $$ BEGIN
    CREATE TYPE reminder_type AS ENUM ('seven_days', 'two_days', 'day_of');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Delivery status
DO $$ BEGIN
    CREATE TYPE delivery_status AS ENUM ('scheduled', 'sent', 'failed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Notification type
DO $$ BEGIN
    CREATE TYPE notification_type AS ENUM (
        'new_event_in_group', 'rsvp_confirmation', 'event_reminder',
        'waitlist_promotion', 'new_message', 'group_announcement',
        'event_update_cancellation'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- DM permission levels
DO $$ BEGIN
    CREATE TYPE dm_permission AS ENUM ('anyone', 'connections', 'attendees', 'organizers');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Report category
DO $$ BEGIN
    CREATE TYPE report_category AS ENUM ('harassment', 'spam', 'inappropriate', 'safety');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Rate limit action
DO $$ BEGIN
    CREATE TYPE rate_limit_action AS ENUM ('allowed', 'warned', 'throttled', 'suspended');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- =============================================================================
-- 3. UTILITY FUNCTIONS
-- =============================================================================

-- Automatically update updated_at timestamp on row update
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- =============================================================================
-- 4. TABLES
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 4.1 users (extends Supabase auth.users)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    bio TEXT CHECK (char_length(bio) <= 500),
    profile_photo_url TEXT,
    location TEXT,
    location_lat DOUBLE PRECISION,
    location_lng DOUBLE PRECISION,
    profile_visibility profile_visibility NOT NULL DEFAULT 'members_only',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT display_name_length CHECK (
        display_name IS NULL OR
        (char_length(display_name) >= 2 AND char_length(display_name) <= 50)
    ),
    CONSTRAINT location_lat_range CHECK (
        location_lat IS NULL OR (location_lat >= -90 AND location_lat <= 90)
    ),
    CONSTRAINT location_lng_range CHECK (
        location_lng IS NULL OR (location_lng >= -180 AND location_lng <= 180)
    )
);

-- -----------------------------------------------------------------------------
-- 4.2 events
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    format_tags event_format_tag[] DEFAULT ARRAY[]::event_format_tag[] NOT NULL,
    accessibility_tags event_accessibility_tag[] DEFAULT ARRAY[]::event_accessibility_tag[] NOT NULL,
    event_size event_size DEFAULT NULL,
    search_vector tsvector GENERATED ALWAYS AS (
        setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(description, '')), 'B')
    ) STORED,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT end_time_after_start CHECK (
        end_time IS NULL OR end_time > start_time
    ),
    CONSTRAINT duration_positive CHECK (
        duration_minutes IS NULL OR duration_minutes > 0
    ),
    CONSTRAINT in_person_has_venue CHECK (
        event_type != 'in_person' OR (venue_name IS NOT NULL AND venue_address IS NOT NULL)
    ),
    CONSTRAINT online_has_link CHECK (
        event_type != 'online' OR video_link IS NOT NULL
    ),
    CONSTRAINT hybrid_has_both CHECK (
        event_type != 'hybrid' OR (
            venue_name IS NOT NULL AND
            venue_address IS NOT NULL AND
            video_link IS NOT NULL
        )
    ),
    CONSTRAINT group_only_has_group CHECK (
        visibility != 'group_only' OR group_id IS NOT NULL
    )
);

-- -----------------------------------------------------------------------------
-- 4.3 event_rsvps
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.event_rsvps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    status rsvp_status NOT NULL,
    attendance_mode attendance_mode,
    waitlist_position INTEGER,
    checked_in_at TIMESTAMPTZ,
    confirmation_status TEXT CHECK (confirmation_status IN ('pending', 'confirmed', 'bailed_out')) DEFAULT 'pending',
    confirmation_sent_at TIMESTAMPTZ,
    confirmation_response_at TIMESTAMPTZ,
    bail_out_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT unique_rsvp_per_user_per_event UNIQUE (event_id, user_id)
);

-- -----------------------------------------------------------------------------
-- 4.4 topics
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    category TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT topic_name_length CHECK (
        char_length(name) >= 2 AND char_length(name) <= 50
    )
);

-- -----------------------------------------------------------------------------
-- 4.5 groups
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    cover_image_url TEXT,
    group_type group_type NOT NULL DEFAULT 'public',
    location TEXT,
    organizer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    search_vector tsvector GENERATED ALWAYS AS (
        setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(description, '')), 'B')
    ) STORED,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT group_name_length CHECK (
        char_length(name) >= 3 AND char_length(name) <= 100
    ),
    CONSTRAINT group_description_length CHECK (
        description IS NULL OR char_length(description) <= 2000
    )
);

-- -----------------------------------------------------------------------------
-- 4.6 group_topics
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.group_topics (
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (group_id, topic_id)
);

-- -----------------------------------------------------------------------------
-- 4.7 group_members
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role group_member_role NOT NULL DEFAULT 'member',
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'banned')),
    join_request_message TEXT,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (group_id, user_id)
);

-- -----------------------------------------------------------------------------
-- 4.8 group_member_actions_log
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.group_member_actions_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    target_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    performed_by_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    action_type group_member_action_type NOT NULL,
    reason TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT action_reason_length CHECK (
        reason IS NULL OR char_length(reason) <= 500
    )
);

-- -----------------------------------------------------------------------------
-- 4.9 event_reminders
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.event_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    reminder_type reminder_type NOT NULL,
    scheduled_for TIMESTAMPTZ NOT NULL,
    status delivery_status NOT NULL DEFAULT 'scheduled',
    sent_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT unique_reminder_per_user_per_event_per_type UNIQUE (event_id, user_id, reminder_type),
    CONSTRAINT scheduled_before_event CHECK (
        scheduled_for < (SELECT start_time FROM public.events WHERE id = event_id)
    )
);

-- -----------------------------------------------------------------------------
-- 4.10 event_comments
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.event_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    parent_comment_id UUID REFERENCES public.event_comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK (LENGTH(TRIM(content)) >= 1 AND LENGTH(content) <= 5000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,

    CHECK (deleted_at IS NULL OR deleted_at >= created_at)
);

-- -----------------------------------------------------------------------------
-- 4.11 notification_preferences
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    notification_type notification_type NOT NULL,
    push_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    email_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    in_app_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (user_id, notification_type)
);

-- -----------------------------------------------------------------------------
-- 4.12 notifications
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    notification_type notification_type NOT NULL,
    title TEXT NOT NULL CHECK (char_length(title) >= 1 AND char_length(title) <= 100),
    message TEXT NOT NULL CHECK (char_length(message) >= 1 AND char_length(message) <= 500),
    link TEXT,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    read_at TIMESTAMPTZ,

    CONSTRAINT read_at_set_when_read CHECK (
        (is_read = FALSE AND read_at IS NULL) OR
        (is_read = TRUE AND read_at IS NOT NULL)
    )
);

-- -----------------------------------------------------------------------------
-- 4.13 push_subscriptions
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT push_subscriptions_endpoint_unique UNIQUE (endpoint)
);

-- -----------------------------------------------------------------------------
-- 4.14 push_delivery_log
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.push_delivery_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL,
    subscription_endpoint TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    error_message TEXT,
    attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT push_delivery_log_status_check
        CHECK (status IN ('pending', 'delivered', 'failed'))
);

-- -----------------------------------------------------------------------------
-- 4.15 user_blocks
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blocker_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    reason TEXT,
    blocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT user_blocks_unique UNIQUE (blocker_id, blocked_id),
    CONSTRAINT user_blocks_no_self_block CHECK (blocker_id <> blocked_id),
    CONSTRAINT user_blocks_reason_length CHECK (
        reason IS NULL OR char_length(reason) <= 500
    )
);

-- -----------------------------------------------------------------------------
-- 4.16 messaging_preferences
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.messaging_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    allow_dm_from dm_permission NOT NULL DEFAULT 'anyone',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT messaging_preferences_unique_user UNIQUE (user_id)
);

-- -----------------------------------------------------------------------------
-- 4.17 user_reports
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    reported_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    category report_category NOT NULL,
    context TEXT,
    additional_details TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved')),
    reported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT user_reports_no_self_report CHECK (reporter_id <> reported_user_id),
    CONSTRAINT user_reports_context_length CHECK (
        context IS NULL OR char_length(context) <= 1000
    ),
    CONSTRAINT user_reports_details_length CHECK (
        additional_details IS NULL OR char_length(additional_details) <= 500
    )
);

-- -----------------------------------------------------------------------------
-- 4.18 message_rate_limits
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.message_rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    message_count INTEGER NOT NULL DEFAULT 0,
    window_start TIMESTAMPTZ NOT NULL,
    window_end TIMESTAMPTZ NOT NULL,
    action_taken rate_limit_action NOT NULL DEFAULT 'allowed',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT rate_limits_valid_window CHECK (window_end > window_start),
    CONSTRAINT rate_limits_positive_count CHECK (message_count >= 0)
);

-- -----------------------------------------------------------------------------
-- 4.19 rate_limit_alerts
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rate_limit_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    alert_type TEXT NOT NULL CHECK (alert_type IN ('mass_messaging', 'repeated_throttle', 'suspension')),
    details TEXT,
    messages_in_window INTEGER NOT NULL,
    window_start TIMESTAMPTZ NOT NULL,
    window_end TIMESTAMPTZ NOT NULL,
    reviewed BOOLEAN NOT NULL DEFAULT FALSE,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =============================================================================
-- 5. INDEXES
-- =============================================================================

-- users
CREATE INDEX IF NOT EXISTS idx_users_display_name ON public.users(display_name);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON public.users(created_at);
CREATE INDEX IF NOT EXISTS idx_users_location_lat ON public.users(location_lat) WHERE location_lat IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_location_lng ON public.users(location_lng) WHERE location_lng IS NOT NULL;

-- events
CREATE INDEX IF NOT EXISTS idx_events_creator_id ON public.events(creator_id);
CREATE INDEX IF NOT EXISTS idx_events_group_id ON public.events(group_id) WHERE group_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_start_time ON public.events(start_time);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON public.events(created_at);
CREATE INDEX IF NOT EXISTS idx_events_event_type ON public.events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_visibility ON public.events(visibility);
CREATE INDEX IF NOT EXISTS idx_events_visibility_start_time ON public.events(visibility, start_time);
CREATE INDEX IF NOT EXISTS idx_events_location ON public.events USING GIST (
    point(venue_lng, venue_lat)
) WHERE venue_lat IS NOT NULL AND venue_lng IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_search ON public.events USING gin(
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, ''))
);
CREATE INDEX IF NOT EXISTS idx_events_search_vector ON public.events USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_events_format_tags ON public.events USING GIN(format_tags);
CREATE INDEX IF NOT EXISTS idx_events_accessibility_tags ON public.events USING GIN(accessibility_tags);
CREATE INDEX IF NOT EXISTS idx_events_size ON public.events(event_size) WHERE event_size IS NOT NULL;

-- event_rsvps
CREATE INDEX IF NOT EXISTS idx_event_rsvps_event_id ON public.event_rsvps(event_id);
CREATE INDEX IF NOT EXISTS idx_event_rsvps_user_id ON public.event_rsvps(user_id);
CREATE INDEX IF NOT EXISTS idx_event_rsvps_status ON public.event_rsvps(status);
CREATE INDEX IF NOT EXISTS idx_event_rsvps_created_at ON public.event_rsvps(created_at);
CREATE INDEX IF NOT EXISTS idx_event_rsvps_event_status ON public.event_rsvps(event_id, status);
CREATE INDEX IF NOT EXISTS idx_event_rsvps_attendance_mode ON public.event_rsvps(attendance_mode);
CREATE INDEX IF NOT EXISTS idx_event_rsvps_waitlist ON public.event_rsvps(event_id, status, waitlist_position)
    WHERE status = 'waitlisted';
CREATE INDEX IF NOT EXISTS idx_event_rsvps_checked_in ON public.event_rsvps(event_id, checked_in_at)
    WHERE checked_in_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_event_rsvps_confirmation ON public.event_rsvps(event_id, confirmation_status)
    WHERE status = 'going' AND confirmation_status IN ('pending', 'confirmed', 'bailed_out');

-- topics
CREATE INDEX IF NOT EXISTS idx_topics_category ON public.topics(category);

-- groups
CREATE INDEX IF NOT EXISTS idx_groups_organizer_id ON public.groups(organizer_id);
CREATE INDEX IF NOT EXISTS idx_groups_created_at ON public.groups(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_groups_name ON public.groups(name);
CREATE INDEX IF NOT EXISTS idx_groups_group_type ON public.groups(group_type);
CREATE INDEX IF NOT EXISTS idx_groups_search ON public.groups USING gin(
    to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, ''))
);
CREATE INDEX IF NOT EXISTS idx_groups_search_vector ON public.groups USING gin(search_vector);

-- group_topics
CREATE INDEX IF NOT EXISTS idx_group_topics_group_id ON public.group_topics(group_id);
CREATE INDEX IF NOT EXISTS idx_group_topics_topic_id ON public.group_topics(topic_id);

-- group_members
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON public.group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON public.group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_role ON public.group_members(role);
CREATE INDEX IF NOT EXISTS idx_group_members_status ON public.group_members(status);
CREATE INDEX IF NOT EXISTS idx_group_members_joined_at ON public.group_members(joined_at DESC);

-- group_member_actions_log
CREATE INDEX IF NOT EXISTS idx_group_member_actions_log_group_id ON public.group_member_actions_log(group_id);
CREATE INDEX IF NOT EXISTS idx_group_member_actions_log_target_user_id ON public.group_member_actions_log(target_user_id);
CREATE INDEX IF NOT EXISTS idx_group_member_actions_log_performed_by_user_id ON public.group_member_actions_log(performed_by_user_id);
CREATE INDEX IF NOT EXISTS idx_group_member_actions_log_action_type ON public.group_member_actions_log(action_type);
CREATE INDEX IF NOT EXISTS idx_group_member_actions_log_created_at ON public.group_member_actions_log(created_at DESC);

-- event_reminders
CREATE INDEX IF NOT EXISTS idx_event_reminders_event_id ON public.event_reminders(event_id);
CREATE INDEX IF NOT EXISTS idx_event_reminders_user_id ON public.event_reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_event_reminders_scheduled_for ON public.event_reminders(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_event_reminders_status ON public.event_reminders(status);
CREATE INDEX IF NOT EXISTS idx_event_reminders_status_scheduled_for
    ON public.event_reminders(status, scheduled_for)
    WHERE status = 'scheduled';

-- event_comments
CREATE INDEX IF NOT EXISTS idx_event_comments_event_id ON public.event_comments(event_id);
CREATE INDEX IF NOT EXISTS idx_event_comments_user_id ON public.event_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_event_comments_parent_id ON public.event_comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_event_comments_created_at ON public.event_comments(created_at);
CREATE INDEX IF NOT EXISTS idx_event_comments_event_parent ON public.event_comments(event_id, parent_comment_id);

-- notification_preferences
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON public.notification_preferences(user_id);

-- notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_created_at ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_is_read ON public.notifications(user_id, is_read);

-- push_subscriptions
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON public.push_subscriptions(user_id);

-- push_delivery_log
CREATE INDEX IF NOT EXISTS idx_push_delivery_log_user_id ON public.push_delivery_log(user_id);
CREATE INDEX IF NOT EXISTS idx_push_delivery_log_attempted_at ON public.push_delivery_log(attempted_at DESC);

-- user_blocks
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker_id ON public.user_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked_id ON public.user_blocks(blocked_id);

-- messaging_preferences
CREATE INDEX IF NOT EXISTS idx_messaging_preferences_user_id ON public.messaging_preferences(user_id);

-- user_reports
CREATE INDEX IF NOT EXISTS idx_user_reports_reporter_id ON public.user_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_user_reports_reported_user_id ON public.user_reports(reported_user_id);
CREATE INDEX IF NOT EXISTS idx_user_reports_status ON public.user_reports(status);

-- message_rate_limits
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_window ON public.message_rate_limits(user_id, window_start, window_end);
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_action ON public.message_rate_limits(user_id, action_taken);

-- rate_limit_alerts
CREATE INDEX IF NOT EXISTS idx_rate_limit_alerts_reviewed ON public.rate_limit_alerts(reviewed, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rate_limit_alerts_user ON public.rate_limit_alerts(user_id, created_at DESC);


-- =============================================================================
-- 6. ROW LEVEL SECURITY
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_member_actions_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_delivery_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messaging_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limit_alerts ENABLE ROW LEVEL SECURITY;

-- ---- users ----
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
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
CREATE POLICY "Users can insert own profile"
    ON public.users FOR INSERT
    WITH CHECK (auth.uid() = id);

-- ---- events ----
DROP POLICY IF EXISTS "Anyone can read public events" ON public.events;
CREATE POLICY "Anyone can read public events"
    ON public.events FOR SELECT
    USING (visibility = 'public');

DROP POLICY IF EXISTS "Authenticated users can read public events" ON public.events;
CREATE POLICY "Authenticated users can read public events"
    ON public.events FOR SELECT
    USING (auth.role() = 'authenticated' AND visibility = 'public');

DROP POLICY IF EXISTS "Creators can read own events" ON public.events;
CREATE POLICY "Creators can read own events"
    ON public.events FOR SELECT
    USING (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Creators can update own events" ON public.events;
CREATE POLICY "Creators can update own events"
    ON public.events FOR UPDATE
    USING (auth.uid() = creator_id)
    WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Creators can delete own events" ON public.events;
CREATE POLICY "Creators can delete own events"
    ON public.events FOR DELETE
    USING (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Authenticated users can create events" ON public.events;
CREATE POLICY "Authenticated users can create events"
    ON public.events FOR INSERT
    WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = creator_id);

DROP POLICY IF EXISTS "Group members can read group-only events" ON public.events;
CREATE POLICY "Group members can read group-only events"
    ON public.events FOR SELECT
    USING (
        visibility = 'group_only'
        AND group_id IS NOT NULL
        AND EXISTS (
            SELECT 1 FROM public.group_members
            WHERE group_members.group_id = events.group_id
            AND group_members.user_id = auth.uid()
            AND group_members.status = 'active'
        )
    );

DROP POLICY IF EXISTS "Only creators can read hidden events" ON public.events;
CREATE POLICY "Only creators can read hidden events"
    ON public.events FOR SELECT
    USING (visibility = 'hidden' AND auth.uid() = creator_id);

-- ---- event_rsvps ----
DROP POLICY IF EXISTS "Users can read own RSVPs" ON public.event_rsvps;
CREATE POLICY "Users can read own RSVPs"
    ON public.event_rsvps FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "RSVPed users can see other attendees" ON public.event_rsvps;
CREATE POLICY "RSVPed users can see other attendees"
    ON public.event_rsvps FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.event_rsvps er
            WHERE er.event_id = event_rsvps.event_id
            AND er.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Event creators can see all RSVPs" ON public.event_rsvps;
CREATE POLICY "Event creators can see all RSVPs"
    ON public.event_rsvps FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.events
            WHERE id = event_rsvps.event_id
            AND creator_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Authenticated users can create RSVPs" ON public.event_rsvps;
CREATE POLICY "Authenticated users can create RSVPs"
    ON public.event_rsvps FOR INSERT
    WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own RSVPs" ON public.event_rsvps;
CREATE POLICY "Users can update own RSVPs"
    ON public.event_rsvps FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own RSVPs" ON public.event_rsvps;
CREATE POLICY "Users can delete own RSVPs"
    ON public.event_rsvps FOR DELETE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Event creators can check in attendees" ON public.event_rsvps;
CREATE POLICY "Event creators can check in attendees"
    ON public.event_rsvps FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.events
            WHERE id = event_rsvps.event_id
            AND creator_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.events
            WHERE id = event_rsvps.event_id
            AND creator_id = auth.uid()
        )
    );

-- ---- topics ----
DROP POLICY IF EXISTS "Anyone can read topics" ON public.topics;
CREATE POLICY "Anyone can read topics"
    ON public.topics FOR SELECT
    USING (true);

-- ---- groups ----
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

DROP POLICY IF EXISTS "Only organizers can delete groups" ON public.groups;
CREATE POLICY "Only organizers can delete groups"
    ON public.groups FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.group_members
            WHERE group_members.group_id = groups.id
            AND group_members.user_id = auth.uid()
            AND group_members.role = 'organizer'
            AND group_members.status = 'active'
        )
    );

-- ---- group_topics ----
DROP POLICY IF EXISTS "Anyone can read public group topics" ON public.group_topics;
CREATE POLICY "Anyone can read public group topics"
    ON public.group_topics FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.groups
            WHERE groups.id = group_topics.group_id
            AND groups.group_type = 'public'
        )
    );

DROP POLICY IF EXISTS "Members can read their private group topics" ON public.group_topics;
CREATE POLICY "Members can read their private group topics"
    ON public.group_topics FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.group_members
            WHERE group_members.group_id = group_topics.group_id
            AND group_members.user_id = auth.uid()
            AND group_members.status = 'active'
        )
    );

DROP POLICY IF EXISTS "Leadership can insert group topics" ON public.group_topics;
CREATE POLICY "Leadership can insert group topics"
    ON public.group_topics FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.group_members
            WHERE group_members.group_id = group_topics.group_id
            AND group_members.user_id = auth.uid()
            AND group_members.role IN ('organizer', 'co_organizer')
            AND group_members.status = 'active'
        )
    );

DROP POLICY IF EXISTS "Leadership can delete group topics" ON public.group_topics;
CREATE POLICY "Leadership can delete group topics"
    ON public.group_topics FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.group_members
            WHERE group_members.group_id = group_topics.group_id
            AND group_members.user_id = auth.uid()
            AND group_members.role IN ('organizer', 'co_organizer')
            AND group_members.status = 'active'
        )
    );

-- ---- group_members ----
DROP POLICY IF EXISTS "Anyone can read public group members" ON public.group_members;
CREATE POLICY "Anyone can read public group members"
    ON public.group_members FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.groups
            WHERE groups.id = group_members.group_id
            AND groups.group_type = 'public'
        )
    );

DROP POLICY IF EXISTS "Members can read their private group members" ON public.group_members;
CREATE POLICY "Members can read their private group members"
    ON public.group_members FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.group_members AS gm
            WHERE gm.group_id = group_members.group_id
            AND gm.user_id = auth.uid()
            AND gm.status = 'active'
        )
    );

DROP POLICY IF EXISTS "Users can read own membership" ON public.group_members;
CREATE POLICY "Users can read own membership"
    ON public.group_members FOR SELECT
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can join public groups" ON public.group_members;
CREATE POLICY "Users can join public groups"
    ON public.group_members FOR INSERT
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

DROP POLICY IF EXISTS "Users can request to join private groups" ON public.group_members;
CREATE POLICY "Users can request to join private groups"
    ON public.group_members FOR INSERT
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

DROP POLICY IF EXISTS "Leadership can update member roles" ON public.group_members;
CREATE POLICY "Leadership can update member roles"
    ON public.group_members FOR UPDATE
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

DROP POLICY IF EXISTS "Members can leave groups" ON public.group_members;
CREATE POLICY "Members can leave groups"
    ON public.group_members FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Leadership can remove members" ON public.group_members;
CREATE POLICY "Leadership can remove members"
    ON public.group_members FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.group_members AS gm
            WHERE gm.group_id = group_members.group_id
            AND gm.user_id = auth.uid()
            AND gm.role IN ('organizer', 'co_organizer', 'assistant_organizer')
            AND gm.status = 'active'
        )
    );

DROP POLICY IF EXISTS "Users can delete own pending requests" ON public.group_members;
CREATE POLICY "Users can delete own pending requests"
    ON public.group_members FOR DELETE
    USING (user_id = auth.uid() AND status = 'pending');

-- ---- group_member_actions_log ----
DROP POLICY IF EXISTS "Leadership can read group action logs" ON public.group_member_actions_log;
CREATE POLICY "Leadership can read group action logs"
    ON public.group_member_actions_log FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.group_members
            WHERE group_members.group_id = group_member_actions_log.group_id
            AND group_members.user_id = auth.uid()
            AND group_members.role IN ('organizer', 'co_organizer', 'assistant_organizer')
            AND group_members.status = 'active'
        )
    );

DROP POLICY IF EXISTS "Service role can insert action logs" ON public.group_member_actions_log;
CREATE POLICY "Service role can insert action logs"
    ON public.group_member_actions_log FOR INSERT
    WITH CHECK (true);

-- ---- event_reminders ----
DROP POLICY IF EXISTS "Users can read own reminders" ON public.event_reminders;
CREATE POLICY "Users can read own reminders"
    ON public.event_reminders FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Event creators can see event reminders" ON public.event_reminders;
CREATE POLICY "Event creators can see event reminders"
    ON public.event_reminders FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.events
            WHERE id = event_reminders.event_id
            AND creator_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "System can insert reminders" ON public.event_reminders;
CREATE POLICY "System can insert reminders"
    ON public.event_reminders FOR INSERT
    WITH CHECK (false);

DROP POLICY IF EXISTS "System can update reminders" ON public.event_reminders;
CREATE POLICY "System can update reminders"
    ON public.event_reminders FOR UPDATE
    USING (false)
    WITH CHECK (false);

DROP POLICY IF EXISTS "Users can delete own reminders" ON public.event_reminders;
CREATE POLICY "Users can delete own reminders"
    ON public.event_reminders FOR DELETE
    USING (auth.uid() = user_id);

-- ---- event_comments ----
DROP POLICY IF EXISTS "RSVPed users can read event comments" ON public.event_comments;
CREATE POLICY "RSVPed users can read event comments"
    ON public.event_comments FOR SELECT
    USING (
        deleted_at IS NULL
        AND EXISTS (
            SELECT 1 FROM public.event_rsvps
            WHERE event_id = event_comments.event_id
            AND user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Event creators can read all comments" ON public.event_comments;
CREATE POLICY "Event creators can read all comments"
    ON public.event_comments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.events
            WHERE id = event_comments.event_id
            AND creator_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "RSVPed users can create comments" ON public.event_comments;
CREATE POLICY "RSVPed users can create comments"
    ON public.event_comments FOR INSERT
    WITH CHECK (
        auth.role() = 'authenticated'
        AND auth.uid() = user_id
        AND EXISTS (
            SELECT 1 FROM public.event_rsvps
            WHERE event_id = event_comments.event_id
            AND user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can update own comments" ON public.event_comments;
CREATE POLICY "Users can update own comments"
    ON public.event_comments FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users and event creators can delete comments" ON public.event_comments;
CREATE POLICY "Users and event creators can delete comments"
    ON public.event_comments FOR UPDATE
    USING (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM public.events
            WHERE id = event_comments.event_id
            AND creator_id = auth.uid()
        )
    )
    WITH CHECK (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM public.events
            WHERE id = event_comments.event_id
            AND creator_id = auth.uid()
        )
    );

-- ---- notification_preferences ----
DROP POLICY IF EXISTS "Users can view own notification preferences" ON public.notification_preferences;
CREATE POLICY "Users can view own notification preferences"
    ON public.notification_preferences FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own notification preferences" ON public.notification_preferences;
CREATE POLICY "Users can insert own notification preferences"
    ON public.notification_preferences FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notification preferences" ON public.notification_preferences;
CREATE POLICY "Users can update own notification preferences"
    ON public.notification_preferences FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ---- notifications ----
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications"
    ON public.notifications FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications"
    ON public.notifications FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can insert notifications" ON public.notifications;
CREATE POLICY "Service role can insert notifications"
    ON public.notifications FOR INSERT
    WITH CHECK (auth.role() = 'service_role' OR auth.uid() = user_id);

-- ---- push_subscriptions ----
DROP POLICY IF EXISTS "Users can view own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can view own push subscriptions"
    ON public.push_subscriptions FOR SELECT
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can insert own push subscriptions"
    ON public.push_subscriptions FOR INSERT
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can update own push subscriptions"
    ON public.push_subscriptions FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can delete own push subscriptions"
    ON public.push_subscriptions FOR DELETE
    USING (user_id = auth.uid());

-- ---- push_delivery_log ----
DROP POLICY IF EXISTS "Users can view own push delivery logs" ON public.push_delivery_log;
CREATE POLICY "Users can view own push delivery logs"
    ON public.push_delivery_log FOR SELECT
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Service role can manage push delivery logs" ON public.push_delivery_log;
CREATE POLICY "Service role can manage push delivery logs"
    ON public.push_delivery_log FOR ALL
    USING (true)
    WITH CHECK (true);

-- ---- user_blocks ----
DROP POLICY IF EXISTS "Users can view own blocks" ON public.user_blocks;
CREATE POLICY "Users can view own blocks"
    ON public.user_blocks FOR SELECT
    USING (blocker_id = auth.uid());

DROP POLICY IF EXISTS "Users can create blocks" ON public.user_blocks;
CREATE POLICY "Users can create blocks"
    ON public.user_blocks FOR INSERT
    WITH CHECK (blocker_id = auth.uid());

DROP POLICY IF EXISTS "Users can remove own blocks" ON public.user_blocks;
CREATE POLICY "Users can remove own blocks"
    ON public.user_blocks FOR DELETE
    USING (blocker_id = auth.uid());

-- ---- messaging_preferences ----
DROP POLICY IF EXISTS "messaging_preferences_read_own" ON public.messaging_preferences;
CREATE POLICY "messaging_preferences_read_own"
    ON public.messaging_preferences FOR SELECT
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "messaging_preferences_insert_own" ON public.messaging_preferences;
CREATE POLICY "messaging_preferences_insert_own"
    ON public.messaging_preferences FOR INSERT
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "messaging_preferences_update_own" ON public.messaging_preferences;
CREATE POLICY "messaging_preferences_update_own"
    ON public.messaging_preferences FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- ---- user_reports ----
DROP POLICY IF EXISTS "Users can view own reports" ON public.user_reports;
CREATE POLICY "Users can view own reports"
    ON public.user_reports FOR SELECT
    USING (reporter_id = auth.uid());

DROP POLICY IF EXISTS "Users can create reports" ON public.user_reports;
CREATE POLICY "Users can create reports"
    ON public.user_reports FOR INSERT
    WITH CHECK (reporter_id = auth.uid());

-- ---- message_rate_limits ----
DROP POLICY IF EXISTS "rate_limits_read_own" ON public.message_rate_limits;
CREATE POLICY "rate_limits_read_own"
    ON public.message_rate_limits FOR SELECT
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "rate_limits_insert_own" ON public.message_rate_limits;
CREATE POLICY "rate_limits_insert_own"
    ON public.message_rate_limits FOR INSERT
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "rate_limits_update_own" ON public.message_rate_limits;
CREATE POLICY "rate_limits_update_own"
    ON public.message_rate_limits FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- ---- rate_limit_alerts ----
DROP POLICY IF EXISTS "rate_limit_alerts_service_only" ON public.rate_limit_alerts;
CREATE POLICY "rate_limit_alerts_service_only"
    ON public.rate_limit_alerts FOR ALL
    USING (false);


-- =============================================================================
-- 7. TRIGGERS
-- =============================================================================

-- updated_at triggers
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_events_updated_at ON public.events;
CREATE TRIGGER update_events_updated_at
    BEFORE UPDATE ON public.events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_event_rsvps_updated_at ON public.event_rsvps;
CREATE TRIGGER update_event_rsvps_updated_at
    BEFORE UPDATE ON public.event_rsvps
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_topics_updated_at ON public.topics;
CREATE TRIGGER update_topics_updated_at
    BEFORE UPDATE ON public.topics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_groups_updated_at ON public.groups;
CREATE TRIGGER update_groups_updated_at
    BEFORE UPDATE ON public.groups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_group_members_updated_at ON public.group_members;
CREATE TRIGGER update_group_members_updated_at
    BEFORE UPDATE ON public.group_members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_event_reminders_updated_at ON public.event_reminders;
CREATE TRIGGER update_event_reminders_updated_at
    BEFORE UPDATE ON public.event_reminders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_event_comments_updated_at ON public.event_comments;
CREATE TRIGGER update_event_comments_updated_at
    BEFORE UPDATE ON public.event_comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_notification_preferences_updated_at ON public.notification_preferences;
CREATE TRIGGER update_notification_preferences_updated_at
    BEFORE UPDATE ON public.notification_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- BUG FIX: Original migrations used update_modified_timestamp() which doesn't exist.
-- Corrected to use update_updated_at_column().
DROP TRIGGER IF EXISTS set_messaging_preferences_updated_at ON public.messaging_preferences;
CREATE TRIGGER set_messaging_preferences_updated_at
    BEFORE UPDATE ON public.messaging_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_rate_limits_updated_at ON public.message_rate_limits;
CREATE TRIGGER set_rate_limits_updated_at
    BEFORE UPDATE ON public.message_rate_limits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_rate_limit_alerts_updated_at ON public.rate_limit_alerts;
CREATE TRIGGER set_rate_limit_alerts_updated_at
    BEFORE UPDATE ON public.rate_limit_alerts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auth trigger: create user profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Auth trigger: create notification preferences on signup
DROP TRIGGER IF EXISTS on_auth_user_created_notification_preferences ON auth.users;
CREATE TRIGGER on_auth_user_created_notification_preferences
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user_notification_preferences();

-- Group trigger: add creator as organizer
DROP TRIGGER IF EXISTS on_group_created ON public.groups;
CREATE TRIGGER on_group_created
    AFTER INSERT ON public.groups
    FOR EACH ROW EXECUTE FUNCTION handle_new_group();

-- Group trigger: enforce at least one organizer
DROP TRIGGER IF EXISTS enforce_organizer_constraint ON public.group_members;
CREATE TRIGGER enforce_organizer_constraint
    BEFORE UPDATE OR DELETE ON public.group_members
    FOR EACH ROW EXECUTE FUNCTION ensure_organizer_exists();

-- RSVP trigger: schedule reminders on insert
DROP TRIGGER IF EXISTS schedule_reminders_on_rsvp_insert ON public.event_rsvps;
CREATE TRIGGER schedule_reminders_on_rsvp_insert
    AFTER INSERT ON public.event_rsvps
    FOR EACH ROW EXECUTE FUNCTION handle_rsvp_reminders();

-- RSVP trigger: update reminders on status change
DROP TRIGGER IF EXISTS update_reminders_on_rsvp_update ON public.event_rsvps;
CREATE TRIGGER update_reminders_on_rsvp_update
    AFTER UPDATE ON public.event_rsvps
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION handle_rsvp_reminder_updates();


-- =============================================================================
-- 8. BUSINESS LOGIC FUNCTIONS
-- =============================================================================

-- handle_new_user: Create user profile on signup (OAuth version - final)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, display_name, profile_photo_url, created_at, updated_at)
    VALUES (
        NEW.id,
        COALESCE(
            NEW.raw_user_meta_data->>'full_name',
            NEW.raw_user_meta_data->>'name',
            NEW.raw_user_meta_data->>'display_name',
            split_part(NEW.email, '@', 1)
        ),
        COALESCE(
            NEW.raw_user_meta_data->>'avatar_url',
            NEW.raw_user_meta_data->>'picture',
            NULL
        ),
        NOW(),
        NOW()
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION handle_new_user() IS 'Automatically creates user profile on signup, importing display name and photo from OAuth providers (Google, Apple, Facebook)';

-- handle_new_group: Add creator as organizer when group is created
CREATE OR REPLACE FUNCTION handle_new_group()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.group_members (group_id, user_id, role, status, joined_at, updated_at)
    VALUES (NEW.id, NEW.organizer_id, 'organizer', 'active', NOW(), NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ensure_organizer_exists: Prevent removing the last organizer
CREATE OR REPLACE FUNCTION ensure_organizer_exists()
RETURNS TRIGGER AS $$
DECLARE
    organizer_count INTEGER;
BEGIN
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

-- reorder_waitlist: Reorder waitlist positions after promotion (FIFO)
CREATE OR REPLACE FUNCTION reorder_waitlist(p_event_id UUID)
RETURNS VOID AS $$
DECLARE
    rsvp_record RECORD;
    new_position INTEGER := 1;
BEGIN
    FOR rsvp_record IN
        SELECT id
        FROM public.event_rsvps
        WHERE event_id = p_event_id
          AND status = 'waitlisted'
        ORDER BY waitlist_position ASC
    LOOP
        UPDATE public.event_rsvps
        SET waitlist_position = new_position,
            updated_at = NOW()
        WHERE id = rsvp_record.id;

        new_position := new_position + 1;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION reorder_waitlist(UUID) IS 'Reorders waitlist positions sequentially after a promotion to maintain FIFO order';

-- calculate_reminder_times: Calculate when reminders should be sent
CREATE OR REPLACE FUNCTION calculate_reminder_times(event_start TIMESTAMPTZ)
RETURNS TABLE (
    reminder_type reminder_type,
    scheduled_for TIMESTAMPTZ
) AS $$
BEGIN
    IF event_start > NOW() + INTERVAL '7 days' THEN
        RETURN QUERY SELECT
            'seven_days'::reminder_type,
            (event_start - INTERVAL '7 days')::date + TIME '09:00:00';
    END IF;

    IF event_start > NOW() + INTERVAL '2 days' THEN
        RETURN QUERY SELECT
            'two_days'::reminder_type,
            (event_start - INTERVAL '2 days')::date + TIME '09:00:00';
    END IF;

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

COMMENT ON FUNCTION calculate_reminder_times IS 'Calculate when reminders should be sent for an event';

-- schedule_event_reminders: Schedule reminders for a user's RSVP
CREATE OR REPLACE FUNCTION schedule_event_reminders(
    p_event_id UUID,
    p_user_id UUID
)
RETURNS void AS $$
DECLARE
    v_event_start TIMESTAMPTZ;
    v_reminder RECORD;
BEGIN
    SELECT start_time INTO v_event_start
    FROM public.events
    WHERE id = p_event_id;

    IF v_event_start <= NOW() THEN
        RETURN;
    END IF;

    FOR v_reminder IN
        SELECT * FROM calculate_reminder_times(v_event_start)
    LOOP
        INSERT INTO public.event_reminders (
            event_id, user_id, reminder_type, scheduled_for, status
        ) VALUES (
            p_event_id, p_user_id, v_reminder.reminder_type,
            v_reminder.scheduled_for, 'scheduled'
        )
        ON CONFLICT (event_id, user_id, reminder_type) DO NOTHING;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION schedule_event_reminders IS 'Schedule reminders for a user RSVP (going/interested)';

-- cancel_event_reminders: Cancel all scheduled reminders for a user's RSVP
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

COMMENT ON FUNCTION cancel_event_reminders IS 'Cancel all scheduled reminders for a user RSVP';

-- handle_rsvp_reminders: Trigger function for RSVP insert
CREATE OR REPLACE FUNCTION handle_rsvp_reminders()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status IN ('going', 'interested') THEN
        PERFORM schedule_event_reminders(NEW.event_id, NEW.user_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- handle_rsvp_reminder_updates: Trigger function for RSVP status change
CREATE OR REPLACE FUNCTION handle_rsvp_reminder_updates()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IN ('going', 'interested') AND NEW.status = 'not_going' THEN
        PERFORM cancel_event_reminders(NEW.event_id, NEW.user_id);
    ELSIF OLD.status = 'not_going' AND NEW.status IN ('going', 'interested') THEN
        PERFORM schedule_event_reminders(NEW.event_id, NEW.user_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- get_rsvps_needing_confirmation: Get RSVPs that need day-of confirmation ping
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
        AND e.start_time > NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_rsvps_needing_confirmation(UUID) IS 'Returns all "going" RSVPs for an event that need a day-of confirmation ping';

-- mark_confirmation_sent: Mark confirmation ping as sent
CREATE OR REPLACE FUNCTION mark_confirmation_sent(p_rsvp_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.event_rsvps
    SET confirmation_sent_at = NOW(),
        updated_at = NOW()
    WHERE id = p_rsvp_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION mark_confirmation_sent(UUID) IS 'Marks that a confirmation ping has been sent to an RSVP';

-- confirm_attendance: Record confirmation response (still coming)
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

COMMENT ON FUNCTION confirm_attendance(UUID) IS 'Records that a user confirmed they are still coming';

-- bail_out_attendance: Record bail-out with waitlist promotion
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
    SELECT event_id, user_id INTO v_event_id, v_user_id
    FROM public.event_rsvps
    WHERE id = p_rsvp_id AND status = 'going';

    IF NOT FOUND THEN
        RETURN;
    END IF;

    UPDATE public.event_rsvps
    SET status = 'not_going',
        confirmation_status = 'bailed_out',
        confirmation_response_at = NOW(),
        bail_out_reason = SUBSTRING(p_reason FROM 1 FOR 500),
        updated_at = NOW()
    WHERE id = p_rsvp_id;

    SELECT capacity INTO v_event_capacity
    FROM public.events
    WHERE id = v_event_id;

    IF v_event_capacity IS NOT NULL THEN
        SELECT COUNT(*) INTO v_going_count
        FROM public.event_rsvps
        WHERE event_id = v_event_id
            AND status = 'going';

        IF v_going_count < v_event_capacity THEN
            SELECT id, user_id INTO v_first_waitlisted
            FROM public.event_rsvps
            WHERE event_id = v_event_id
                AND status = 'waitlisted'
            ORDER BY waitlist_position ASC
            LIMIT 1;

            IF FOUND THEN
                UPDATE public.event_rsvps
                SET status = 'going',
                    waitlist_position = NULL,
                    updated_at = NOW()
                WHERE id = v_first_waitlisted.id;

                PERFORM reorder_waitlist(v_event_id);
            END IF;
        END IF;
    END IF;

    PERFORM cancel_event_reminders(v_event_id, v_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION bail_out_attendance(UUID, TEXT) IS 'Records that a user bailed out, with optional reason. Auto-promotes from waitlist if applicable.';

-- search_events_ranked: Full-text search for events (V3 - final, with end_time and filters)
CREATE OR REPLACE FUNCTION public.search_events_ranked(
    search_query TEXT,
    max_results INT DEFAULT 20,
    current_user_id UUID DEFAULT NULL,
    filter_event_type event_type DEFAULT NULL,
    filter_start_date TIMESTAMPTZ DEFAULT NULL,
    filter_end_date TIMESTAMPTZ DEFAULT NULL,
    filter_event_size event_size DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    description TEXT,
    event_type event_type,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    venue_name TEXT,
    venue_address TEXT,
    capacity INT,
    cover_image_url TEXT,
    visibility event_visibility,
    creator_id UUID,
    group_id UUID,
    event_size event_size,
    rank REAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    search_tsquery tsquery;
BEGIN
    search_tsquery := websearch_to_tsquery('english', search_query);

    IF search_tsquery IS NULL THEN
        search_tsquery := plainto_tsquery('english', search_query);
    END IF;

    IF search_tsquery IS NULL THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT
        e.id,
        e.title,
        e.description,
        e.event_type,
        e.start_time,
        e.end_time,
        e.venue_name,
        e.venue_address,
        e.capacity,
        e.cover_image_url,
        e.visibility,
        e.creator_id,
        e.group_id,
        e.event_size,
        ts_rank_cd(e.search_vector, search_tsquery) AS rank
    FROM public.events e
    WHERE
        e.search_vector @@ search_tsquery
        AND e.start_time >= NOW()
        AND (
            e.visibility = 'public'
            OR (current_user_id IS NOT NULL AND e.creator_id = current_user_id)
        )
        AND (filter_event_type IS NULL OR e.event_type = filter_event_type)
        AND (filter_start_date IS NULL OR e.start_time >= filter_start_date)
        AND (filter_end_date IS NULL OR e.start_time <= filter_end_date)
        AND (filter_event_size IS NULL OR e.event_size = filter_event_size)
    ORDER BY
        rank DESC,
        e.start_time ASC
    LIMIT max_results;
END;
$$;

COMMENT ON FUNCTION public.search_events_ranked IS 'Full-text search for events with relevance ranking, typo tolerance, filters (type, date range, size), and end_time';

-- search_groups_ranked: Full-text search for groups
CREATE OR REPLACE FUNCTION public.search_groups_ranked(
    search_query TEXT,
    max_results INT DEFAULT 20,
    current_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    description TEXT,
    cover_image_url TEXT,
    group_type group_type,
    location TEXT,
    organizer_id UUID,
    rank REAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    search_tsquery tsquery;
BEGIN
    search_tsquery := websearch_to_tsquery('english', search_query);

    IF search_tsquery IS NULL THEN
        search_tsquery := plainto_tsquery('english', search_query);
    END IF;

    IF search_tsquery IS NULL THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT
        g.id,
        g.name,
        g.description,
        g.cover_image_url,
        g.group_type,
        g.location,
        g.organizer_id,
        ts_rank_cd(g.search_vector, search_tsquery) AS rank
    FROM public.groups g
    WHERE
        g.search_vector @@ search_tsquery
        AND g.group_type = 'public'
    ORDER BY
        rank DESC,
        g.created_at DESC
    LIMIT max_results;
END;
$$;

COMMENT ON FUNCTION public.search_groups_ranked IS 'Full-text search for groups with relevance ranking and typo tolerance';

-- initialize_notification_preferences: Set default notification prefs for user
CREATE OR REPLACE FUNCTION initialize_notification_preferences(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    v_notification_type notification_type;
BEGIN
    FOREACH v_notification_type IN ARRAY ENUM_RANGE(NULL::notification_type)
    LOOP
        INSERT INTO public.notification_preferences (user_id, notification_type, push_enabled, email_enabled, in_app_enabled)
        VALUES (
            p_user_id,
            v_notification_type,
            CASE
                WHEN v_notification_type = 'rsvp_confirmation' THEN FALSE
                ELSE TRUE
            END,
            TRUE,
            TRUE
        )
        ON CONFLICT (user_id, notification_type) DO NOTHING;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- handle_new_user_notification_preferences: Trigger function for auth signup
CREATE OR REPLACE FUNCTION handle_new_user_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM initialize_notification_preferences(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- mark_notification_read: Mark a single notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.notifications
    SET is_read = TRUE, read_at = NOW()
    WHERE id = p_notification_id AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- mark_all_notifications_read: Mark all notifications as read
CREATE OR REPLACE FUNCTION mark_all_notifications_read()
RETURNS VOID AS $$
BEGIN
    UPDATE public.notifications
    SET is_read = TRUE, read_at = NOW()
    WHERE user_id = auth.uid() AND is_read = FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- get_unread_notification_count: Get unread count for current user
CREATE OR REPLACE FUNCTION get_unread_notification_count()
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
        FROM public.notifications
        WHERE user_id = auth.uid() AND is_read = FALSE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- get_user_push_subscriptions: Get push subscriptions for server-side sending
CREATE OR REPLACE FUNCTION get_user_push_subscriptions(p_user_id UUID)
RETURNS TABLE (
    endpoint TEXT,
    p256dh TEXT,
    auth TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT ps.endpoint, ps.p256dh, ps.auth
    FROM public.push_subscriptions ps
    WHERE ps.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- is_user_blocked: Check if a user has blocked another
CREATE OR REPLACE FUNCTION is_user_blocked(p_blocker_id UUID, p_blocked_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_blocks
        WHERE blocker_id = p_blocker_id AND blocked_id = p_blocked_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- initialize_messaging_preferences: Set default messaging prefs for user
CREATE OR REPLACE FUNCTION initialize_messaging_preferences(p_user_id UUID)
RETURNS void AS $$
BEGIN
    INSERT INTO public.messaging_preferences (user_id, allow_dm_from)
    VALUES (p_user_id, 'anyone')
    ON CONFLICT (user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- can_receive_dm: Check if a user can receive a DM from another user
CREATE OR REPLACE FUNCTION can_receive_dm(recipient_id UUID, sender_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    perm dm_permission;
BEGIN
    SELECT allow_dm_from INTO perm
    FROM public.messaging_preferences
    WHERE user_id = recipient_id;

    IF perm IS NULL THEN
        RETURN true;
    END IF;

    IF perm = 'anyone' THEN
        RETURN true;
    END IF;

    -- For other modes, additional checks would be needed when
    -- connections/co-attendance tables exist. For now, return true.
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- check_rate_limit: Check if a user is currently rate-limited
CREATE OR REPLACE FUNCTION check_rate_limit(p_user_id UUID)
RETURNS rate_limit_action AS $$
DECLARE
    current_record RECORD;
BEGIN
    SELECT action_taken, message_count, window_end
    INTO current_record
    FROM public.message_rate_limits
    WHERE user_id = p_user_id
    ORDER BY window_start DESC
    LIMIT 1;

    IF current_record IS NULL THEN
        RETURN 'allowed';
    END IF;

    IF current_record.window_end < now() THEN
        RETURN 'allowed';
    END IF;

    RETURN current_record.action_taken;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- record_message_send: Record a message send and evaluate rate limits
CREATE OR REPLACE FUNCTION record_message_send(p_user_id UUID)
RETURNS rate_limit_action AS $$
DECLARE
    window_start_time TIMESTAMPTZ := now() - INTERVAL '1 hour';
    msg_count INTEGER;
    throttle_count INTEGER;
    new_action rate_limit_action;
BEGIN
    SELECT COUNT(*)
    INTO msg_count
    FROM public.message_rate_limits
    WHERE user_id = p_user_id
        AND window_start >= window_start_time
        AND action_taken IN ('allowed', 'warned');

    msg_count := msg_count + 1;

    IF msg_count >= 10 THEN
        SELECT COUNT(*)
        INTO throttle_count
        FROM public.message_rate_limits
        WHERE user_id = p_user_id
            AND window_start >= now() - INTERVAL '24 hours'
            AND action_taken IN ('throttled', 'suspended');

        IF throttle_count >= 3 THEN
            new_action := 'suspended';
        ELSE
            new_action := 'throttled';
        END IF;
    ELSIF msg_count >= 7 THEN
        new_action := 'warned';
    ELSE
        new_action := 'allowed';
    END IF;

    INSERT INTO public.message_rate_limits (user_id, message_count, window_start, window_end, action_taken)
    VALUES (p_user_id, msg_count, now(), now() + INTERVAL '1 hour', new_action);

    IF new_action IN ('throttled', 'suspended') THEN
        INSERT INTO public.rate_limit_alerts (
            user_id, alert_type, details, messages_in_window, window_start, window_end
        ) VALUES (
            p_user_id,
            CASE new_action
                WHEN 'suspended' THEN 'suspension'
                ELSE 'mass_messaging'
            END,
            CASE new_action
                WHEN 'suspended' THEN 'User suspended after repeated rate limit violations'
                ELSE 'User exceeded ' || msg_count || ' messages in 1-hour window'
            END,
            msg_count,
            now(),
            now() + INTERVAL '1 hour'
        );
    END IF;

    RETURN new_action;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =============================================================================
-- 9. GRANTS
-- =============================================================================

GRANT EXECUTE ON FUNCTION public.search_events_ranked TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_events_ranked TO anon;
GRANT EXECUTE ON FUNCTION public.search_groups_ranked TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_groups_ranked TO anon;
GRANT EXECUTE ON FUNCTION get_user_push_subscriptions(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_user_blocked(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION initialize_messaging_preferences TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION can_receive_dm TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION check_rate_limit TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION record_message_send TO authenticated, service_role;


-- =============================================================================
-- 10. SEED DATA
-- =============================================================================

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


-- =============================================================================
-- TABLE COMMENTS
-- =============================================================================

COMMENT ON TABLE public.users IS 'User profile data extending Supabase auth.users';
COMMENT ON COLUMN public.users.id IS 'References auth.users(id) - unique user identifier';
COMMENT ON COLUMN public.users.display_name IS 'User visible name (2-50 chars)';
COMMENT ON COLUMN public.users.bio IS 'User bio/about section (max 500 chars)';
COMMENT ON COLUMN public.users.profile_photo_url IS 'URL to profile photo in Supabase Storage';
COMMENT ON COLUMN public.users.location IS 'User city/area for recommendations';
COMMENT ON COLUMN public.users.location_lat IS 'Latitude of user''s saved location (geocoded from location text field)';
COMMENT ON COLUMN public.users.location_lng IS 'Longitude of user''s saved location (geocoded from location text field)';
COMMENT ON COLUMN public.users.profile_visibility IS 'Who can view this profile';

COMMENT ON TABLE public.events IS 'Events - scheduled meetups that can be standalone or group-hosted';
COMMENT ON COLUMN public.events.id IS 'Unique event identifier';
COMMENT ON COLUMN public.events.creator_id IS 'User who created the event (becomes host)';
COMMENT ON COLUMN public.events.group_id IS 'Associated group (NULL for standalone events)';
COMMENT ON COLUMN public.events.title IS 'Event title (5-100 chars)';
COMMENT ON COLUMN public.events.description IS 'Event description (max 5000 chars)';
COMMENT ON COLUMN public.events.event_type IS 'Type: in_person, online, or hybrid';
COMMENT ON COLUMN public.events.visibility IS 'Who can see this event: public, group_only, or hidden';
COMMENT ON COLUMN public.events.start_time IS 'Event start date and time';
COMMENT ON COLUMN public.events.end_time IS 'Event end date and time (optional)';
COMMENT ON COLUMN public.events.duration_minutes IS 'Event duration in minutes (alternative to end_time)';
COMMENT ON COLUMN public.events.venue_name IS 'Venue name for in-person/hybrid events';
COMMENT ON COLUMN public.events.venue_address IS 'Full address for in-person/hybrid events';
COMMENT ON COLUMN public.events.venue_lat IS 'Venue latitude for map integration';
COMMENT ON COLUMN public.events.venue_lng IS 'Venue longitude for map integration';
COMMENT ON COLUMN public.events.video_link IS 'Video conference link for online/hybrid events';
COMMENT ON COLUMN public.events.capacity IS 'Maximum attendees (1-10000, NULL for unlimited)';
COMMENT ON COLUMN public.events.cover_image_url IS 'URL to cover image in Supabase Storage';
COMMENT ON COLUMN public.events.format_tags IS 'Event format tags (speaker, workshop, activity, etc.) - multiple allowed';
COMMENT ON COLUMN public.events.accessibility_tags IS 'Accessibility indicators (first-timer friendly, structured, etc.) - multiple allowed';
COMMENT ON COLUMN public.events.event_size IS 'Event size category (intimate, small, medium, large) - auto-calculated from capacity or manually set';
COMMENT ON COLUMN public.events.search_vector IS 'Generated tsvector for relevance-ranked full-text search (title weighted A, description weighted B)';

COMMENT ON TABLE public.event_rsvps IS 'Event RSVPs with three-tier status: going, interested, not_going (plus waitlisted)';
COMMENT ON COLUMN public.event_rsvps.id IS 'Unique RSVP identifier';
COMMENT ON COLUMN public.event_rsvps.event_id IS 'Event being RSVPed to';
COMMENT ON COLUMN public.event_rsvps.user_id IS 'User making the RSVP';
COMMENT ON COLUMN public.event_rsvps.status IS 'RSVP status: going, interested, not_going, or waitlisted';
COMMENT ON COLUMN public.event_rsvps.attendance_mode IS 'Attendance mode for hybrid events: in_person or online';
COMMENT ON COLUMN public.event_rsvps.waitlist_position IS 'FIFO position in waitlist queue (1 = first in line)';
COMMENT ON COLUMN public.event_rsvps.checked_in_at IS 'Timestamp when attendee was checked in by event host';
COMMENT ON COLUMN public.event_rsvps.confirmation_status IS 'Day-of confirmation status: pending, confirmed, or bailed_out';
COMMENT ON COLUMN public.event_rsvps.confirmation_sent_at IS 'When the "still coming?" ping was sent';
COMMENT ON COLUMN public.event_rsvps.confirmation_response_at IS 'When the user responded to the confirmation ping';
COMMENT ON COLUMN public.event_rsvps.bail_out_reason IS 'Optional reason provided when bailing out (max 500 chars)';

COMMENT ON TABLE public.topics IS 'Curated list of interest categories';
COMMENT ON COLUMN public.topics.name IS 'Display name of the topic';
COMMENT ON COLUMN public.topics.slug IS 'URL-friendly identifier';
COMMENT ON COLUMN public.topics.category IS 'Top-level category for grouping';

COMMENT ON TABLE public.groups IS 'Community groups that organize events';
COMMENT ON COLUMN public.groups.id IS 'Unique group identifier';
COMMENT ON COLUMN public.groups.name IS 'Group name (3-100 chars)';
COMMENT ON COLUMN public.groups.description IS 'Group description (max 2000 chars)';
COMMENT ON COLUMN public.groups.group_type IS 'Public (anyone can join) or Private (requires approval)';
COMMENT ON COLUMN public.groups.organizer_id IS 'User who created the group';
COMMENT ON COLUMN public.groups.search_vector IS 'Generated tsvector for relevance-ranked full-text search (name weighted A, description weighted B)';

COMMENT ON TABLE public.group_topics IS 'Junction table linking groups to topics';

COMMENT ON TABLE public.group_members IS 'Group membership and roles';
COMMENT ON COLUMN public.group_members.role IS 'Member role and permissions level';
COMMENT ON COLUMN public.group_members.status IS 'active, pending (join request), or banned';

COMMENT ON TABLE public.group_member_actions_log IS 'Log of member management actions (removal, ban, etc.)';
COMMENT ON COLUMN public.group_member_actions_log.action_type IS 'Type of action performed';
COMMENT ON COLUMN public.group_member_actions_log.reason IS 'Optional reason for the action (max 500 chars)';
COMMENT ON COLUMN public.group_member_actions_log.metadata IS 'Additional context as JSON (e.g., role changes)';

COMMENT ON TABLE public.event_reminders IS 'Scheduled reminders for event attendees';
COMMENT ON COLUMN public.event_reminders.id IS 'Unique reminder identifier';
COMMENT ON COLUMN public.event_reminders.event_id IS 'Event being reminded about';
COMMENT ON COLUMN public.event_reminders.user_id IS 'User receiving the reminder';
COMMENT ON COLUMN public.event_reminders.reminder_type IS 'Type: seven_days, two_days, or day_of';
COMMENT ON COLUMN public.event_reminders.scheduled_for IS 'When the reminder should be sent';
COMMENT ON COLUMN public.event_reminders.status IS 'Delivery status: scheduled, sent, failed, or cancelled';
COMMENT ON COLUMN public.event_reminders.sent_at IS 'When the reminder was actually sent';
COMMENT ON COLUMN public.event_reminders.error_message IS 'Error details if delivery failed';

COMMENT ON TABLE public.event_comments IS 'Threaded comments on events, visible only to RSVPed users';
COMMENT ON COLUMN public.event_comments.id IS 'Unique comment identifier';
COMMENT ON COLUMN public.event_comments.event_id IS 'Event this comment belongs to';
COMMENT ON COLUMN public.event_comments.user_id IS 'User who posted the comment';
COMMENT ON COLUMN public.event_comments.parent_comment_id IS 'Parent comment for threading (null for top-level comments)';
COMMENT ON COLUMN public.event_comments.content IS 'Comment text (1-5000 characters)';
COMMENT ON COLUMN public.event_comments.deleted_at IS 'Soft delete timestamp (null if not deleted)';

COMMENT ON TABLE public.notification_preferences IS 'User notification preferences by channel and type';
COMMENT ON TABLE public.notifications IS 'Individual in-app notifications for the notification center';
COMMENT ON TABLE public.push_subscriptions IS 'Web Push API subscription data for push notifications';
COMMENT ON TABLE public.push_delivery_log IS 'Delivery status tracking for push notifications';
COMMENT ON TABLE public.user_blocks IS 'User block list preventing all contact between users';
COMMENT ON TABLE public.messaging_preferences IS 'Controls who can send direct messages to each user';
COMMENT ON COLUMN public.messaging_preferences.allow_dm_from IS 'DM permission level: anyone, connections, attendees, or organizers';
COMMENT ON TABLE public.user_reports IS 'User reports for harassment, spam, inappropriate content, and safety';
COMMENT ON TABLE public.message_rate_limits IS 'Tracks per-user message activity for rate limit evaluation';
COMMENT ON TABLE public.rate_limit_alerts IS 'Admin alerts for suspicious messaging patterns requiring review';
COMMENT ON FUNCTION check_rate_limit IS 'Returns current rate limit status for a user (allowed/warned/throttled/suspended)';
COMMENT ON FUNCTION record_message_send IS 'Records a message send event and returns the rate limit action (10 msg/hr limit, suspension after 3 throttles in 24h)';
