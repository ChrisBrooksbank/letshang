-- Event Comments Schema
-- Creates event_comments table for threaded discussion on events
-- Migration: 20260126_event_comments

-- Create event_comments table
CREATE TABLE IF NOT EXISTS public.event_comments (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Foreign keys
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

    -- Threading support
    parent_comment_id UUID REFERENCES public.event_comments(id) ON DELETE CASCADE,

    -- Comment content
    content TEXT NOT NULL CHECK (LENGTH(TRIM(content)) >= 1 AND LENGTH(content) <= 5000),

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,

    -- Constraints
    CHECK (deleted_at IS NULL OR deleted_at >= created_at)
);

-- Create indexes for common queries
CREATE INDEX idx_event_comments_event_id ON public.event_comments(event_id);
CREATE INDEX idx_event_comments_user_id ON public.event_comments(user_id);
CREATE INDEX idx_event_comments_parent_id ON public.event_comments(parent_comment_id);
CREATE INDEX idx_event_comments_created_at ON public.event_comments(created_at);

-- Composite index for fetching event comments with parent relationship
CREATE INDEX idx_event_comments_event_parent ON public.event_comments(event_id, parent_comment_id);

-- Enable Row Level Security
ALTER TABLE public.event_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users who have RSVPed can read comments
-- (both top-level and replies, only non-deleted)
CREATE POLICY "RSVPed users can read event comments"
    ON public.event_comments
    FOR SELECT
    USING (
        deleted_at IS NULL
        AND EXISTS (
            SELECT 1 FROM public.event_rsvps
            WHERE event_id = event_comments.event_id
            AND user_id = auth.uid()
        )
    );

-- RLS Policy: Event creators can read all comments (including deleted)
CREATE POLICY "Event creators can read all comments"
    ON public.event_comments
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.events
            WHERE id = event_comments.event_id
            AND creator_id = auth.uid()
        )
    );

-- RLS Policy: RSVPed users can create comments
CREATE POLICY "RSVPed users can create comments"
    ON public.event_comments
    FOR INSERT
    WITH CHECK (
        auth.role() = 'authenticated'
        AND auth.uid() = user_id
        AND EXISTS (
            SELECT 1 FROM public.event_rsvps
            WHERE event_id = event_comments.event_id
            AND user_id = auth.uid()
        )
    );

-- RLS Policy: Users can update their own comments (only content)
CREATE POLICY "Users can update own comments"
    ON public.event_comments
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can soft delete their own comments
-- Event creators can soft delete any comment on their events
CREATE POLICY "Users and event creators can delete comments"
    ON public.event_comments
    FOR UPDATE
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

-- Create trigger to update updated_at on row update
CREATE TRIGGER update_event_comments_updated_at
    BEFORE UPDATE ON public.event_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add helpful comments
COMMENT ON TABLE public.event_comments IS 'Threaded comments on events, visible only to RSVPed users';
COMMENT ON COLUMN public.event_comments.id IS 'Unique comment identifier';
COMMENT ON COLUMN public.event_comments.event_id IS 'Event this comment belongs to';
COMMENT ON COLUMN public.event_comments.user_id IS 'User who posted the comment';
COMMENT ON COLUMN public.event_comments.parent_comment_id IS 'Parent comment for threading (null for top-level comments)';
COMMENT ON COLUMN public.event_comments.content IS 'Comment text (1-5000 characters)';
COMMENT ON COLUMN public.event_comments.created_at IS 'When the comment was posted';
COMMENT ON COLUMN public.event_comments.updated_at IS 'When the comment was last edited';
COMMENT ON COLUMN public.event_comments.deleted_at IS 'Soft delete timestamp (null if not deleted)';
