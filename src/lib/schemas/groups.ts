/**
 * Group validation schemas
 *
 * Zod schemas for validating group creation and updates.
 * Used with Superforms for type-safe form validation.
 */

import { z } from 'zod';

/**
 * Schema for group creation
 */
export const groupCreateSchema = z.object({
	name: z
		.string()
		.min(3, 'Group name must be at least 3 characters')
		.max(100, 'Group name must be at most 100 characters')
		.trim(),
	description: z
		.string()
		.max(2000, 'Description must be at most 2000 characters')
		.trim()
		.optional()
		.nullable(),
	cover_image_url: z.string().url('Invalid image URL').optional().nullable(),
	group_type: z.enum(['public', 'private']).default('public'),
	location: z.string().trim().optional().nullable(),
	topic_ids: z
		.array(z.string().uuid('Invalid topic ID'))
		.min(1, 'At least 1 topic is required')
		.max(5, 'Maximum 5 topics allowed')
});

/**
 * Schema for group update
 */
export const groupUpdateSchema = z.object({
	name: z
		.string()
		.min(3, 'Group name must be at least 3 characters')
		.max(100, 'Group name must be at most 100 characters')
		.trim()
		.optional(),
	description: z
		.string()
		.max(2000, 'Description must be at most 2000 characters')
		.trim()
		.optional()
		.nullable(),
	cover_image_url: z.string().url('Invalid image URL').optional().nullable(),
	group_type: z.enum(['public', 'private']).optional(),
	location: z.string().trim().optional().nullable(),
	topic_ids: z
		.array(z.string().uuid('Invalid topic ID'))
		.min(1, 'At least 1 topic is required')
		.max(5, 'Maximum 5 topics allowed')
		.optional()
});

/**
 * Schema for join request (private groups)
 */
export const joinRequestSchema = z.object({
	group_id: z.string().uuid('Invalid group ID'),
	message: z
		.string()
		.max(500, 'Message must be at most 500 characters')
		.trim()
		.optional()
		.nullable()
});

/**
 * Schema for member role update
 */
export const memberRoleUpdateSchema = z.object({
	member_id: z.string().uuid('Invalid member ID'),
	role: z.enum(['organizer', 'co_organizer', 'assistant_organizer', 'event_organizer', 'member'])
});

/**
 * Schema for join request response (approve/deny)
 */
export const joinRequestResponseSchema = z.object({
	member_id: z.string().uuid('Invalid member ID'),
	approve: z.boolean(),
	message: z
		.string()
		.max(500, 'Message must be at most 500 characters')
		.trim()
		.optional()
		.nullable()
});

/**
 * Schema for removing/banning a member
 */
export const memberRemovalSchema = z.object({
	member_id: z.string().uuid('Invalid member ID'),
	ban: z.boolean().default(false),
	reason: z.string().max(500, 'Reason must be at most 500 characters').trim().optional().nullable()
});

/**
 * Type exports for use in forms and API handlers
 * These types will be used in future iterations when building the group UI
 */
// Commenting out until used to satisfy knip (unused exports check)
// export type GroupCreate = z.infer<typeof groupCreateSchema>;
// export type GroupUpdate = z.infer<typeof groupUpdateSchema>;
// export type JoinRequest = z.infer<typeof joinRequestSchema>;
// export type MemberRoleUpdate = z.infer<typeof memberRoleUpdateSchema>;
// export type JoinRequestResponse = z.infer<typeof joinRequestResponseSchema>;
// export type MemberRemoval = z.infer<typeof memberRemovalSchema>;
