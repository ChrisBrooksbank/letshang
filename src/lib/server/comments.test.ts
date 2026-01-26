import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchEventComments, createComment, editComment, deleteComment } from './comments';
import { supabaseAdmin } from './supabase';

// Mock the supabase client
vi.mock('./supabase', () => ({
	supabaseAdmin: {
		from: vi.fn()
	}
}));

describe('Comment Server Functions', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('fetchEventComments', () => {
		it('should fetch comments when user has RSVPed', async () => {
			const mockRsvp = { id: 'rsvp-1' };
			const mockComments = [
				{
					id: 'comment-1',
					event_id: 'event-1',
					user_id: 'user-1',
					parent_comment_id: null,
					content: 'Great event!',
					created_at: '2026-01-26T10:00:00Z',
					updated_at: '2026-01-26T10:00:00Z',
					deleted_at: null,
					users: {
						id: 'user-1',
						display_name: 'John Doe',
						avatar_url: 'https://example.com/avatar.jpg'
					}
				}
			];

			vi.mocked(supabaseAdmin.from).mockReturnValueOnce({
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				single: vi.fn().mockResolvedValue({ data: mockRsvp, error: null })
			} as never);

			vi.mocked(supabaseAdmin.from).mockReturnValueOnce({
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				is: vi.fn().mockResolvedValue({ count: 1, error: null })
			} as never);

			vi.mocked(supabaseAdmin.from).mockReturnValueOnce({
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				is: vi.fn().mockReturnThis(),
				order: vi.fn().mockReturnThis(),
				range: vi.fn().mockResolvedValue({ data: mockComments, error: null })
			} as never);

			const result = await fetchEventComments('event-1', 'user-1');

			expect(result.comments).toHaveLength(1);
			expect(result.total).toBe(1);
			expect(result.error).toBeUndefined();
			expect(result.comments[0].content).toBe('Great event!');
			expect(result.comments[0].user.display_name).toBe('John Doe');
		});

		it('should return error when user has not RSVPed', async () => {
			vi.mocked(supabaseAdmin.from).mockReturnValueOnce({
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } })
			} as never);

			const result = await fetchEventComments('event-1', 'user-1');

			expect(result.comments).toHaveLength(0);
			expect(result.total).toBe(0);
			expect(result.error).toBe('You must RSVP to view comments');
		});

		it('should handle pagination correctly', async () => {
			const mockRsvp = { id: 'rsvp-1' };

			vi.mocked(supabaseAdmin.from).mockReturnValueOnce({
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				single: vi.fn().mockResolvedValue({ data: mockRsvp, error: null })
			} as never);

			vi.mocked(supabaseAdmin.from).mockReturnValueOnce({
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				is: vi.fn().mockResolvedValue({ count: 100, error: null })
			} as never);

			const rangeFn = vi.fn().mockResolvedValue({ data: [], error: null });
			vi.mocked(supabaseAdmin.from).mockReturnValueOnce({
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				is: vi.fn().mockReturnThis(),
				order: vi.fn().mockReturnThis(),
				range: rangeFn
			} as never);

			await fetchEventComments('event-1', 'user-1', 10, 20);

			expect(rangeFn).toHaveBeenCalledWith(20, 29);
		});

		it('should exclude deleted comments', async () => {
			const mockRsvp = { id: 'rsvp-1' };

			vi.mocked(supabaseAdmin.from).mockReturnValueOnce({
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				single: vi.fn().mockResolvedValue({ data: mockRsvp, error: null })
			} as never);

			const isNullFn = vi.fn().mockResolvedValue({ count: 0, error: null });
			vi.mocked(supabaseAdmin.from).mockReturnValueOnce({
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				is: isNullFn
			} as never);

			vi.mocked(supabaseAdmin.from).mockReturnValueOnce({
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				is: vi.fn().mockReturnThis(),
				order: vi.fn().mockReturnThis(),
				range: vi.fn().mockResolvedValue({ data: [], error: null })
			} as never);

			await fetchEventComments('event-1', 'user-1');

			expect(isNullFn).toHaveBeenCalledWith('deleted_at', null);
		});

		it('should handle database errors', async () => {
			vi.mocked(supabaseAdmin.from).mockReturnValueOnce({
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				single: vi.fn().mockResolvedValue({ data: { id: 'rsvp-1' }, error: null })
			} as never);

			vi.mocked(supabaseAdmin.from).mockReturnValueOnce({
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				is: vi.fn().mockResolvedValue({ count: null, error: { message: 'DB error' } })
			} as never);

			const result = await fetchEventComments('event-1', 'user-1');

			expect(result.comments).toHaveLength(0);
			expect(result.error).toContain('Failed to count comments');
		});
	});

	describe('createComment', () => {
		it('should create comment when user has RSVPed', async () => {
			const mockRsvp = { id: 'rsvp-1' };
			const mockComment = {
				id: 'comment-1',
				event_id: 'event-1',
				user_id: 'user-1',
				parent_comment_id: null,
				content: 'Great event!',
				created_at: '2026-01-26T10:00:00Z',
				updated_at: '2026-01-26T10:00:00Z',
				deleted_at: null,
				users: {
					id: 'user-1',
					display_name: 'John Doe',
					avatar_url: 'https://example.com/avatar.jpg'
				}
			};

			vi.mocked(supabaseAdmin.from).mockReturnValueOnce({
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				single: vi.fn().mockResolvedValue({ data: mockRsvp, error: null })
			} as never);

			vi.mocked(supabaseAdmin.from).mockReturnValueOnce({
				insert: vi.fn().mockReturnThis(),
				select: vi.fn().mockReturnThis(),
				single: vi.fn().mockResolvedValue({ data: mockComment, error: null })
			} as never);

			const result = await createComment('event-1', 'user-1', 'Great event!');

			expect(result.comment).toBeDefined();
			expect(result.error).toBeUndefined();
			expect(result.comment?.content).toBe('Great event!');
		});

		it('should return error when user has not RSVPed', async () => {
			vi.mocked(supabaseAdmin.from).mockReturnValueOnce({
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } })
			} as never);

			const result = await createComment('event-1', 'user-1', 'Comment');

			expect(result.comment).toBeUndefined();
			expect(result.error).toBe('You must RSVP to comment on this event');
		});

		it('should create reply comment when parent exists', async () => {
			const mockRsvp = { id: 'rsvp-1' };
			const mockParent = { event_id: 'event-1' };
			const mockComment = {
				id: 'comment-2',
				event_id: 'event-1',
				user_id: 'user-1',
				parent_comment_id: 'comment-1',
				content: 'Thanks!',
				created_at: '2026-01-26T10:00:00Z',
				updated_at: '2026-01-26T10:00:00Z',
				deleted_at: null,
				users: {
					id: 'user-1',
					display_name: 'John Doe',
					avatar_url: 'https://example.com/avatar.jpg'
				}
			};

			vi.mocked(supabaseAdmin.from).mockReturnValueOnce({
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				single: vi.fn().mockResolvedValue({ data: mockRsvp, error: null })
			} as never);

			vi.mocked(supabaseAdmin.from).mockReturnValueOnce({
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				is: vi.fn().mockReturnThis(),
				single: vi.fn().mockResolvedValue({ data: mockParent, error: null })
			} as never);

			vi.mocked(supabaseAdmin.from).mockReturnValueOnce({
				insert: vi.fn().mockReturnThis(),
				select: vi.fn().mockReturnThis(),
				single: vi.fn().mockResolvedValue({ data: mockComment, error: null })
			} as never);

			const result = await createComment('event-1', 'user-1', 'Thanks!', 'comment-1');

			expect(result.comment).toBeDefined();
			expect(result.comment?.parent_comment_id).toBe('comment-1');
		});

		it('should reject reply when parent comment does not exist', async () => {
			const mockRsvp = { id: 'rsvp-1' };

			vi.mocked(supabaseAdmin.from).mockReturnValueOnce({
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				single: vi.fn().mockResolvedValue({ data: mockRsvp, error: null })
			} as never);

			vi.mocked(supabaseAdmin.from).mockReturnValueOnce({
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				is: vi.fn().mockReturnThis(),
				single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } })
			} as never);

			const result = await createComment('event-1', 'user-1', 'Reply', 'invalid-parent');

			expect(result.comment).toBeUndefined();
			expect(result.error).toBe('Parent comment not found');
		});

		it('should reject reply when parent belongs to different event', async () => {
			const mockRsvp = { id: 'rsvp-1' };
			const mockParent = { event_id: 'event-2' };

			vi.mocked(supabaseAdmin.from).mockReturnValueOnce({
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				single: vi.fn().mockResolvedValue({ data: mockRsvp, error: null })
			} as never);

			vi.mocked(supabaseAdmin.from).mockReturnValueOnce({
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				is: vi.fn().mockReturnThis(),
				single: vi.fn().mockResolvedValue({ data: mockParent, error: null })
			} as never);

			const result = await createComment('event-1', 'user-1', 'Reply', 'comment-from-other-event');

			expect(result.comment).toBeUndefined();
			expect(result.error).toBe('Parent comment belongs to a different event');
		});

		it('should handle database errors', async () => {
			vi.mocked(supabaseAdmin.from).mockReturnValueOnce({
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				single: vi.fn().mockResolvedValue({ data: { id: 'rsvp-1' }, error: null })
			} as never);

			vi.mocked(supabaseAdmin.from).mockReturnValueOnce({
				insert: vi.fn().mockReturnThis(),
				select: vi.fn().mockReturnThis(),
				single: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } })
			} as never);

			const result = await createComment('event-1', 'user-1', 'Comment');

			expect(result.comment).toBeUndefined();
			expect(result.error).toContain('Failed to create comment');
		});
	});

	describe('editComment', () => {
		it('should edit comment when user owns it', async () => {
			const mockExisting = { id: 'comment-1', user_id: 'user-1', deleted_at: null };
			const mockUpdated = {
				id: 'comment-1',
				event_id: 'event-1',
				user_id: 'user-1',
				parent_comment_id: null,
				content: 'Updated comment',
				created_at: '2026-01-26T10:00:00Z',
				updated_at: '2026-01-26T10:05:00Z',
				deleted_at: null,
				users: {
					id: 'user-1',
					display_name: 'John Doe',
					avatar_url: 'https://example.com/avatar.jpg'
				}
			};

			vi.mocked(supabaseAdmin.from).mockReturnValueOnce({
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				single: vi.fn().mockResolvedValue({ data: mockExisting, error: null })
			} as never);

			vi.mocked(supabaseAdmin.from).mockReturnValueOnce({
				update: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				select: vi.fn().mockReturnThis(),
				single: vi.fn().mockResolvedValue({ data: mockUpdated, error: null })
			} as never);

			const result = await editComment('comment-1', 'user-1', 'Updated comment');

			expect(result.comment).toBeDefined();
			expect(result.comment?.content).toBe('Updated comment');
			expect(result.error).toBeUndefined();
		});

		it('should return error when comment not found', async () => {
			vi.mocked(supabaseAdmin.from).mockReturnValueOnce({
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } })
			} as never);

			const result = await editComment('invalid-id', 'user-1', 'New content');

			expect(result.comment).toBeUndefined();
			expect(result.error).toBe('Comment not found');
		});

		it('should return error when user does not own comment', async () => {
			const mockExisting = { id: 'comment-1', user_id: 'user-2', deleted_at: null };

			vi.mocked(supabaseAdmin.from).mockReturnValueOnce({
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				single: vi.fn().mockResolvedValue({ data: mockExisting, error: null })
			} as never);

			const result = await editComment('comment-1', 'user-1', 'Updated');

			expect(result.comment).toBeUndefined();
			expect(result.error).toBe('You can only edit your own comments');
		});

		it('should return error when comment is deleted', async () => {
			const mockExisting = {
				id: 'comment-1',
				user_id: 'user-1',
				deleted_at: '2026-01-26T09:00:00Z'
			};

			vi.mocked(supabaseAdmin.from).mockReturnValueOnce({
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				single: vi.fn().mockResolvedValue({ data: mockExisting, error: null })
			} as never);

			const result = await editComment('comment-1', 'user-1', 'Updated');

			expect(result.comment).toBeUndefined();
			expect(result.error).toBe('Cannot edit deleted comment');
		});

		it('should handle database errors', async () => {
			const mockExisting = { id: 'comment-1', user_id: 'user-1', deleted_at: null };

			vi.mocked(supabaseAdmin.from).mockReturnValueOnce({
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				single: vi.fn().mockResolvedValue({ data: mockExisting, error: null })
			} as never);

			vi.mocked(supabaseAdmin.from).mockReturnValueOnce({
				update: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				select: vi.fn().mockReturnThis(),
				single: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } })
			} as never);

			const result = await editComment('comment-1', 'user-1', 'Updated');

			expect(result.comment).toBeUndefined();
			expect(result.error).toContain('Failed to edit comment');
		});
	});

	describe('deleteComment', () => {
		it('should delete comment when user owns it', async () => {
			const mockComment = {
				id: 'comment-1',
				user_id: 'user-1',
				event_id: 'event-1',
				deleted_at: null,
				events: { creator_id: 'user-2' }
			};

			vi.mocked(supabaseAdmin.from).mockReturnValueOnce({
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				single: vi.fn().mockResolvedValue({ data: mockComment, error: null })
			} as never);

			vi.mocked(supabaseAdmin.from).mockReturnValueOnce({
				update: vi.fn().mockReturnThis(),
				eq: vi.fn().mockResolvedValue({ error: null })
			} as never);

			const result = await deleteComment('comment-1', 'user-1');

			expect(result.success).toBe(true);
			expect(result.error).toBeUndefined();
		});

		it('should delete comment when user is event creator', async () => {
			const mockComment = {
				id: 'comment-1',
				user_id: 'user-2',
				event_id: 'event-1',
				deleted_at: null,
				events: { creator_id: 'user-1' }
			};

			vi.mocked(supabaseAdmin.from).mockReturnValueOnce({
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				single: vi.fn().mockResolvedValue({ data: mockComment, error: null })
			} as never);

			vi.mocked(supabaseAdmin.from).mockReturnValueOnce({
				update: vi.fn().mockReturnThis(),
				eq: vi.fn().mockResolvedValue({ error: null })
			} as never);

			const result = await deleteComment('comment-1', 'user-1');

			expect(result.success).toBe(true);
		});

		it('should return error when comment not found', async () => {
			vi.mocked(supabaseAdmin.from).mockReturnValueOnce({
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } })
			} as never);

			const result = await deleteComment('invalid-id', 'user-1');

			expect(result.success).toBe(false);
			expect(result.error).toBe('Comment not found');
		});

		it('should return error when user is not owner or event creator', async () => {
			const mockComment = {
				id: 'comment-1',
				user_id: 'user-2',
				event_id: 'event-1',
				deleted_at: null,
				events: { creator_id: 'user-3' }
			};

			vi.mocked(supabaseAdmin.from).mockReturnValueOnce({
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				single: vi.fn().mockResolvedValue({ data: mockComment, error: null })
			} as never);

			const result = await deleteComment('comment-1', 'user-1');

			expect(result.success).toBe(false);
			expect(result.error).toBe('You can only delete your own comments or comments on your events');
		});

		it('should return error when comment already deleted', async () => {
			const mockComment = {
				id: 'comment-1',
				user_id: 'user-1',
				event_id: 'event-1',
				deleted_at: '2026-01-26T09:00:00Z',
				events: { creator_id: 'user-2' }
			};

			vi.mocked(supabaseAdmin.from).mockReturnValueOnce({
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				single: vi.fn().mockResolvedValue({ data: mockComment, error: null })
			} as never);

			const result = await deleteComment('comment-1', 'user-1');

			expect(result.success).toBe(false);
			expect(result.error).toBe('Comment already deleted');
		});

		it('should handle database errors', async () => {
			const mockComment = {
				id: 'comment-1',
				user_id: 'user-1',
				event_id: 'event-1',
				deleted_at: null,
				events: { creator_id: 'user-2' }
			};

			vi.mocked(supabaseAdmin.from).mockReturnValueOnce({
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				single: vi.fn().mockResolvedValue({ data: mockComment, error: null })
			} as never);

			vi.mocked(supabaseAdmin.from).mockReturnValueOnce({
				update: vi.fn().mockReturnThis(),
				eq: vi.fn().mockResolvedValue({ error: { message: 'DB error' } })
			} as never);

			const result = await deleteComment('comment-1', 'user-1');

			expect(result.success).toBe(false);
			expect(result.error).toContain('Failed to delete comment');
		});
	});
});
