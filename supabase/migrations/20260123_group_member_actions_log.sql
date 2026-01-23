-- Group Member Actions Log Schema
-- Creates table to log member management actions (removal, ban, etc.)
-- Migration: 20260123_group_member_actions_log

-- Create enum for action type
CREATE TYPE group_member_action_type AS ENUM (
    'removed',
    'banned',
    'unbanned',
    'role_changed'
);

-- Create group_member_actions_log table
CREATE TABLE IF NOT EXISTS public.group_member_actions_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    target_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    performed_by_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    action_type group_member_action_type NOT NULL,
    reason TEXT,
    metadata JSONB, -- Additional context (e.g., previous role, new role)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT action_reason_length CHECK (
        reason IS NULL OR char_length(reason) <= 500
    )
);

-- Create indexes for group_member_actions_log
CREATE INDEX idx_group_member_actions_log_group_id ON public.group_member_actions_log(group_id);
CREATE INDEX idx_group_member_actions_log_target_user_id ON public.group_member_actions_log(target_user_id);
CREATE INDEX idx_group_member_actions_log_performed_by_user_id ON public.group_member_actions_log(performed_by_user_id);
CREATE INDEX idx_group_member_actions_log_action_type ON public.group_member_actions_log(action_type);
CREATE INDEX idx_group_member_actions_log_created_at ON public.group_member_actions_log(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.group_member_actions_log ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Leadership can read action logs for their groups
CREATE POLICY "Leadership can read group action logs"
    ON public.group_member_actions_log
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.group_members
            WHERE group_members.group_id = group_member_actions_log.group_id
            AND group_members.user_id = auth.uid()
            AND group_members.role IN ('organizer', 'co_organizer', 'assistant_organizer')
            AND group_members.status = 'active'
        )
    );

-- RLS Policy: System can insert action logs (from server-side code)
CREATE POLICY "Service role can insert action logs"
    ON public.group_member_actions_log
    FOR INSERT
    WITH CHECK (true);

-- Add helpful comments
COMMENT ON TABLE public.group_member_actions_log IS 'Log of member management actions (removal, ban, etc.)';
COMMENT ON COLUMN public.group_member_actions_log.action_type IS 'Type of action performed';
COMMENT ON COLUMN public.group_member_actions_log.reason IS 'Optional reason for the action (max 500 chars)';
COMMENT ON COLUMN public.group_member_actions_log.metadata IS 'Additional context as JSON (e.g., role changes)';
