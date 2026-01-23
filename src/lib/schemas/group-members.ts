/**
 * Zod schemas for group member management
 */
import { z } from 'zod';

/**
 * Valid group member roles in hierarchy order (highest to lowest)
 */
export const GROUP_MEMBER_ROLES = [
	'organizer',
	'co_organizer',
	'assistant_organizer',
	'event_organizer',
	'member'
] as const;

export type GroupMemberRole = (typeof GROUP_MEMBER_ROLES)[number];

/**
 * Role hierarchy levels (higher number = more permissions)
 */
export const ROLE_HIERARCHY: Record<GroupMemberRole, number> = {
	organizer: 4,
	co_organizer: 3,
	assistant_organizer: 2,
	event_organizer: 1,
	member: 0
};

/**
 * Human-readable role names
 */
export const ROLE_DISPLAY_NAMES: Record<GroupMemberRole, string> = {
	organizer: 'Organizer',
	co_organizer: 'Co-organizer',
	assistant_organizer: 'Assistant Organizer',
	event_organizer: 'Event Organizer',
	member: 'Member'
};

/**
 * Role descriptions for UI
 */
export const ROLE_DESCRIPTIONS: Record<GroupMemberRole, string> = {
	organizer: 'Full control - settings, billing, delete, assign all roles',
	co_organizer: 'All permissions except delete group or remove organizer',
	assistant_organizer: 'Manage members and create/manage events',
	event_organizer: 'Create/edit events, manage attendance, check-in',
	member: 'Participate in events and discussions'
};

/**
 * Schema for updating a member's role
 */
export const updateMemberRoleSchema = z.object({
	memberId: z.string().uuid('Invalid member ID'),
	newRole: z.enum(GROUP_MEMBER_ROLES, {
		message: 'Invalid role'
	})
});

// Export type for potential future use (commented to avoid unused export warnings)
// export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;

/**
 * Schema for removing a member from a group
 */
export const removeMemberSchema = z.object({
	memberId: z.string().uuid('Invalid member ID'),
	reason: z
		.string()
		.max(500, 'Reason must be 500 characters or less')
		.optional()
		.transform((val) => (val === '' ? undefined : val))
});

// Export type for potential future use (commented to avoid unused export warnings)
// export type RemoveMemberInput = z.infer<typeof removeMemberSchema>;

/**
 * Schema for banning a member from a group
 */
export const banMemberSchema = z.object({
	memberId: z.string().uuid('Invalid member ID'),
	reason: z
		.string()
		.min(1, 'Ban reason is required')
		.max(500, 'Reason must be 500 characters or less')
});

// Export type for potential future use (commented to avoid unused export warnings)
// export type BanMemberInput = z.infer<typeof banMemberSchema>;

/**
 * Check if a user can assign a specific role based on their own role
 * @param assignerRole The role of the user attempting to assign
 * @param targetRole The role being assigned
 * @returns true if the assigner can assign the target role
 */
export function canAssignRole(assignerRole: GroupMemberRole, targetRole: GroupMemberRole): boolean {
	// Can only assign roles at or below your own level
	return ROLE_HIERARCHY[assignerRole] >= ROLE_HIERARCHY[targetRole];
}

/**
 * Check if a user can modify another member based on roles
 * @param assignerRole The role of the user attempting the modification
 * @param targetRole The role of the member being modified
 * @returns true if the assigner can modify the target
 */
export function canModifyMember(
	assignerRole: GroupMemberRole,
	targetRole: GroupMemberRole
): boolean {
	// Can only modify members at a lower level than you
	// (cannot modify peers or superiors)
	return ROLE_HIERARCHY[assignerRole] > ROLE_HIERARCHY[targetRole];
}

/**
 * Get roles that a user can assign to others based on their own role
 * @param assignerRole The role of the user
 * @returns Array of roles that can be assigned
 */
export function getAssignableRoles(assignerRole: GroupMemberRole): GroupMemberRole[] {
	const assignerLevel = ROLE_HIERARCHY[assignerRole];
	return GROUP_MEMBER_ROLES.filter((role) => ROLE_HIERARCHY[role] <= assignerLevel);
}
