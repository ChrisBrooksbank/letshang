/**
 * Zod schemas for user block management
 */
import { z } from 'zod';

/**
 * Schema for blocking a user
 */
export const blockUserSchema = z.object({
	blockedId: z.string().uuid('Invalid user ID'),
	reason: z
		.string()
		.max(500, 'Reason must be 500 characters or less')
		.optional()
		.transform((val) => (val === '' ? undefined : val))
});

/**
 * Schema for unblocking a user
 */
export const unblockUserSchema = z.object({
	blockedId: z.string().uuid('Invalid user ID')
});

/**
 * Type representing a blocked user entry with display info
 */
export interface BlockedUser {
	id: string;
	blockedId: string;
	displayName: string | null;
	reason: string | null;
	blockedAt: string;
}
