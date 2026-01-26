/**
 * Server-Side Comment Management
 *
 * Functions for managing event comments with proper permission checks.
 * This module uses the service role client to bypass RLS for admin operations.
 *
 * Comments are visible only to users who have RSVPed to the event.
 */

import { supabaseAdmin } from './supabase';

/**
 * Comment with user and reply information
 */
export interface CommentWithUser {
	id: string;
	event_id: string;
	user_id: string;
	parent_comment_id: string | null;
	content: string;
	created_at: string;
	updated_at: string;
	deleted_at: string | null;
	user: {
		id: string;
		display_name: string | null;
		avatar_url: string | null;
	};
	reply_count?: number;
}

/**
 * Fetch comments for an event
 *
 * @param eventId - Event ID to fetch comments for
 * @param userId - User ID making the request (for permission check)
 * @param limit - Maximum number of comments to fetch (default 50)
 * @param offset - Offset for pagination (default 0)
 * @returns Array of comments with user data
 */
export async function fetchEventComments(
	eventId: string,
	userId: string,
	limit = 50,
	offset = 0
): Promise<{
	comments: CommentWithUser[];
	total: number;
	error?: string;
}> {
	try {
		// First, check if user has RSVPed to this event
		const { data: rsvp, error: rsvpError } = await supabaseAdmin
			.from('event_rsvps')
			.select('id')
			.eq('event_id', eventId)
			.eq('user_id', userId)
			.single();

		if (rsvpError || !rsvp) {
			return {
				comments: [],
				total: 0,
				error: 'You must RSVP to view comments'
			};
		}

		// Fetch total count (excluding deleted comments)
		const { count, error: countError } = await supabaseAdmin
			.from('event_comments')
			.select('*', { count: 'exact', head: true })
			.eq('event_id', eventId)
			.is('deleted_at', null);

		if (countError) {
			throw new Error(`Failed to count comments: ${countError.message}`);
		}

		// Fetch comments with user data
		const { data, error } = await supabaseAdmin
			.from('event_comments')
			.select(
				`
				id,
				event_id,
				user_id,
				parent_comment_id,
				content,
				created_at,
				updated_at,
				deleted_at,
				users!inner (
					id,
					display_name,
					avatar_url
				)
			`
			)
			.eq('event_id', eventId)
			.is('deleted_at', null)
			.order('created_at', { ascending: false })
			.range(offset, offset + limit - 1);

		if (error) {
			throw new Error(`Failed to fetch comments: ${error.message}`);
		}

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const comments: CommentWithUser[] = (data || []).map((item: any) => ({
			id: item.id,
			event_id: item.event_id,
			user_id: item.user_id,
			parent_comment_id: item.parent_comment_id,
			content: item.content,
			created_at: item.created_at,
			updated_at: item.updated_at,
			deleted_at: item.deleted_at,
			user: {
				id: item.users.id,
				display_name: item.users.display_name,
				avatar_url: item.users.avatar_url
			}
		}));

		return {
			comments,
			total: count || 0
		};
	} catch (err) {
		const error = err instanceof Error ? err.message : 'Unknown error';
		return {
			comments: [],
			total: 0,
			error
		};
	}
}

/**
 * Create a new comment
 *
 * @param eventId - Event ID to comment on
 * @param userId - User ID creating the comment
 * @param content - Comment content
 * @param parentCommentId - Optional parent comment for threading
 * @returns Created comment or error
 */
export async function createComment(
	eventId: string,
	userId: string,
	content: string,
	parentCommentId: string | null = null
): Promise<{
	comment?: CommentWithUser;
	error?: string;
}> {
	try {
		// Check if user has RSVPed to this event
		const { data: rsvp, error: rsvpError } = await supabaseAdmin
			.from('event_rsvps')
			.select('id')
			.eq('event_id', eventId)
			.eq('user_id', userId)
			.single();

		if (rsvpError || !rsvp) {
			return {
				error: 'You must RSVP to comment on this event'
			};
		}

		// If replying to a comment, verify parent exists and belongs to same event
		if (parentCommentId) {
			const { data: parentComment, error: parentError } = await supabaseAdmin
				.from('event_comments')
				.select('event_id')
				.eq('id', parentCommentId)
				.is('deleted_at', null)
				.single();

			if (parentError || !parentComment) {
				return {
					error: 'Parent comment not found'
				};
			}

			if (parentComment.event_id !== eventId) {
				return {
					error: 'Parent comment belongs to a different event'
				};
			}
		}

		// Create the comment
		const { data, error } = await supabaseAdmin
			.from('event_comments')
			.insert({
				event_id: eventId,
				user_id: userId,
				content,
				parent_comment_id: parentCommentId
			})
			.select(
				`
				id,
				event_id,
				user_id,
				parent_comment_id,
				content,
				created_at,
				updated_at,
				deleted_at,
				users!inner (
					id,
					display_name,
					avatar_url
				)
			`
			)
			.single();

		if (error) {
			throw new Error(`Failed to create comment: ${error.message}`);
		}

		const comment: CommentWithUser = {
			id: data.id,
			event_id: data.event_id,
			user_id: data.user_id,
			parent_comment_id: data.parent_comment_id,
			content: data.content,
			created_at: data.created_at,
			updated_at: data.updated_at,
			deleted_at: data.deleted_at,
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			user: (data as any).users
		};

		return { comment };
	} catch (err) {
		const error = err instanceof Error ? err.message : 'Unknown error';
		return { error };
	}
}

/**
 * Edit an existing comment
 *
 * @param commentId - Comment ID to edit
 * @param userId - User ID making the edit
 * @param content - New comment content
 * @returns Updated comment or error
 */
export async function editComment(
	commentId: string,
	userId: string,
	content: string
): Promise<{
	comment?: CommentWithUser;
	error?: string;
}> {
	try {
		// Verify user owns this comment
		const { data: existingComment, error: fetchError } = await supabaseAdmin
			.from('event_comments')
			.select('id, user_id, deleted_at')
			.eq('id', commentId)
			.single();

		if (fetchError || !existingComment) {
			return {
				error: 'Comment not found'
			};
		}

		if (existingComment.user_id !== userId) {
			return {
				error: 'You can only edit your own comments'
			};
		}

		if (existingComment.deleted_at) {
			return {
				error: 'Cannot edit deleted comment'
			};
		}

		// Update the comment
		const { data, error } = await supabaseAdmin
			.from('event_comments')
			.update({ content })
			.eq('id', commentId)
			.select(
				`
				id,
				event_id,
				user_id,
				parent_comment_id,
				content,
				created_at,
				updated_at,
				deleted_at,
				users!inner (
					id,
					display_name,
					avatar_url
				)
			`
			)
			.single();

		if (error) {
			throw new Error(`Failed to edit comment: ${error.message}`);
		}

		const comment: CommentWithUser = {
			id: data.id,
			event_id: data.event_id,
			user_id: data.user_id,
			parent_comment_id: data.parent_comment_id,
			content: data.content,
			created_at: data.created_at,
			updated_at: data.updated_at,
			deleted_at: data.deleted_at,
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			user: (data as any).users
		};

		return { comment };
	} catch (err) {
		const error = err instanceof Error ? err.message : 'Unknown error';
		return { error };
	}
}

/**
 * Delete a comment (soft delete)
 *
 * @param commentId - Comment ID to delete
 * @param userId - User ID making the deletion
 * @returns Success status or error
 */
export async function deleteComment(
	commentId: string,
	userId: string
): Promise<{
	success: boolean;
	error?: string;
}> {
	try {
		// Verify user owns this comment OR is the event creator
		const { data: comment, error: fetchError } = await supabaseAdmin
			.from('event_comments')
			.select(
				`
				id,
				user_id,
				event_id,
				deleted_at,
				events!inner (
					creator_id
				)
			`
			)
			.eq('id', commentId)
			.single();

		if (fetchError || !comment) {
			return {
				success: false,
				error: 'Comment not found'
			};
		}

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const eventCreatorId = (comment as any).events.creator_id;
		const isOwner = comment.user_id === userId;
		const isEventCreator = eventCreatorId === userId;

		if (!isOwner && !isEventCreator) {
			return {
				success: false,
				error: 'You can only delete your own comments or comments on your events'
			};
		}

		if (comment.deleted_at) {
			return {
				success: false,
				error: 'Comment already deleted'
			};
		}

		// Soft delete by setting deleted_at timestamp
		const { error } = await supabaseAdmin
			.from('event_comments')
			.update({ deleted_at: new Date().toISOString() })
			.eq('id', commentId);

		if (error) {
			throw new Error(`Failed to delete comment: ${error.message}`);
		}

		return { success: true };
	} catch (err) {
		const error = err instanceof Error ? err.message : 'Unknown error';
		return {
			success: false,
			error
		};
	}
}
