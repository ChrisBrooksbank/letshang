-- Event Visibility RLS Policies
-- Adds RLS policies for group_only and hidden event visibility
-- Migration: 20260123_event_visibility_rls

-- RLS Policy: Group members can read group-only events
-- A user can see a group_only event if they are an active member of that group
CREATE POLICY "Group members can read group-only events"
    ON public.events
    FOR SELECT
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

-- RLS Policy: Hidden events not visible in discovery
-- Hidden events require direct link/access code (to be implemented in P2)
-- For now, only the creator can see hidden events
CREATE POLICY "Only creators can read hidden events"
    ON public.events
    FOR SELECT
    USING (
        visibility = 'hidden'
        AND auth.uid() = creator_id
    );

-- Add constraint: group_only events must have a group_id
ALTER TABLE public.events
    ADD CONSTRAINT group_only_has_group CHECK (
        visibility != 'group_only' OR group_id IS NOT NULL
    );

-- Add helpful comments
COMMENT ON CONSTRAINT group_only_has_group ON public.events IS
    'Group-only events must be associated with a group';
