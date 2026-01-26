import { z } from 'zod';

/**
 * Comment content validation
 * Must be 1-5000 characters after trimming
 */
const COMMENT_MIN_LENGTH = 1;
const COMMENT_MAX_LENGTH = 5000;

/**
 * Comment creation schema
 * Validates comment content and optional parent reference for threading
 */
export const commentCreationSchema = z.object({
	// Event ID this comment belongs to
	eventId: z.string().uuid('Invalid event ID'),

	// Comment content: 1-5000 characters
	content: z
		.string()
		.trim()
		.min(COMMENT_MIN_LENGTH, 'Comment cannot be empty')
		.max(COMMENT_MAX_LENGTH, `Comment must not exceed ${COMMENT_MAX_LENGTH} characters`),

	// Optional parent comment for threading (null for top-level comments)
	parentCommentId: z.string().uuid('Invalid parent comment ID').nullable().optional().default(null)
});

/**
 * Comment edit schema
 * Only allows editing the content field
 */
export const commentEditSchema = z.object({
	// Comment ID being edited
	commentId: z.string().uuid('Invalid comment ID'),

	// New content: 1-5000 characters
	content: z
		.string()
		.trim()
		.min(COMMENT_MIN_LENGTH, 'Comment cannot be empty')
		.max(COMMENT_MAX_LENGTH, `Comment must not exceed ${COMMENT_MAX_LENGTH} characters`)
});

/**
 * Comment deletion schema
 * Soft deletes a comment by setting deleted_at timestamp
 */
export const commentDeletionSchema = z.object({
	// Comment ID being deleted
	commentId: z.string().uuid('Invalid comment ID')
});

/**
 * Comment query schema
 * For fetching comments for an event
 */
export const commentQuerySchema = z.object({
	// Event ID to fetch comments for
	eventId: z.string().uuid('Invalid event ID'),

	// Optional limit for pagination (default 50)
	limit: z.number().int().min(1).max(100).optional().default(50),

	// Optional offset for pagination (default 0)
	offset: z.number().int().min(0).optional().default(0)
});

/**
 * Type exports for TypeScript
 * Currently unused but available for future use
 */
// export type CommentCreation = z.infer<typeof commentCreationSchema>;
// export type CommentEdit = z.infer<typeof commentEditSchema>;
// export type CommentDeletion = z.infer<typeof commentDeletionSchema>;
// export type CommentQuery = z.infer<typeof commentQuerySchema>;
