import { describe, it, expect } from 'vitest';
import {
	commentCreationSchema,
	commentEditSchema,
	commentDeletionSchema,
	commentQuerySchema
} from './comments';

describe('Comment Schemas', () => {
	describe('commentCreationSchema', () => {
		describe('valid comments', () => {
			it('should accept valid top-level comment', () => {
				const data = {
					eventId: '123e4567-e89b-12d3-a456-426614174000',
					content: 'This is a valid comment'
				};
				const result = commentCreationSchema.safeParse(data);
				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data.parentCommentId).toBe(null);
				}
			});

			it('should accept valid reply comment', () => {
				const data = {
					eventId: '123e4567-e89b-12d3-a456-426614174000',
					content: 'This is a reply',
					parentCommentId: '223e4567-e89b-12d3-a456-426614174000'
				};
				const result = commentCreationSchema.safeParse(data);
				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data.parentCommentId).toBe('223e4567-e89b-12d3-a456-426614174000');
				}
			});

			it('should accept comment with maximum length (5000 chars)', () => {
				const data = {
					eventId: '123e4567-e89b-12d3-a456-426614174000',
					content: 'a'.repeat(5000)
				};
				const result = commentCreationSchema.safeParse(data);
				expect(result.success).toBe(true);
			});

			it('should accept comment with single character', () => {
				const data = {
					eventId: '123e4567-e89b-12d3-a456-426614174000',
					content: 'a'
				};
				const result = commentCreationSchema.safeParse(data);
				expect(result.success).toBe(true);
			});

			it('should trim whitespace from content', () => {
				const data = {
					eventId: '123e4567-e89b-12d3-a456-426614174000',
					content: '  This has whitespace  '
				};
				const result = commentCreationSchema.safeParse(data);
				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data.content).toBe('This has whitespace');
				}
			});

			it('should accept null parentCommentId explicitly', () => {
				const data = {
					eventId: '123e4567-e89b-12d3-a456-426614174000',
					content: 'Top-level comment',
					parentCommentId: null
				};
				const result = commentCreationSchema.safeParse(data);
				expect(result.success).toBe(true);
			});

			it('should accept comment with newlines', () => {
				const data = {
					eventId: '123e4567-e89b-12d3-a456-426614174000',
					content: 'Line 1\nLine 2\nLine 3'
				};
				const result = commentCreationSchema.safeParse(data);
				expect(result.success).toBe(true);
			});

			it('should accept comment with special characters', () => {
				const data = {
					eventId: '123e4567-e89b-12d3-a456-426614174000',
					content: 'Comment with emoji 🎉 and symbols: @#$%^&*()'
				};
				const result = commentCreationSchema.safeParse(data);
				expect(result.success).toBe(true);
			});
		});

		describe('invalid eventId', () => {
			it('should reject missing eventId', () => {
				const data = {
					content: 'Comment without event ID'
				};
				const result = commentCreationSchema.safeParse(data);
				expect(result.success).toBe(false);
			});

			it('should reject non-UUID eventId', () => {
				const data = {
					eventId: 'not-a-uuid',
					content: 'Valid comment'
				};
				const result = commentCreationSchema.safeParse(data);
				expect(result.success).toBe(false);
			});

			it('should reject empty string eventId', () => {
				const data = {
					eventId: '',
					content: 'Valid comment'
				};
				const result = commentCreationSchema.safeParse(data);
				expect(result.success).toBe(false);
			});
		});

		describe('invalid content', () => {
			it('should reject empty content', () => {
				const data = {
					eventId: '123e4567-e89b-12d3-a456-426614174000',
					content: ''
				};
				const result = commentCreationSchema.safeParse(data);
				expect(result.success).toBe(false);
			});

			it('should reject whitespace-only content', () => {
				const data = {
					eventId: '123e4567-e89b-12d3-a456-426614174000',
					content: '   '
				};
				const result = commentCreationSchema.safeParse(data);
				expect(result.success).toBe(false);
			});

			it('should reject content exceeding 5000 characters', () => {
				const data = {
					eventId: '123e4567-e89b-12d3-a456-426614174000',
					content: 'a'.repeat(5001)
				};
				const result = commentCreationSchema.safeParse(data);
				expect(result.success).toBe(false);
			});

			it('should reject missing content', () => {
				const data = {
					eventId: '123e4567-e89b-12d3-a456-426614174000'
				};
				const result = commentCreationSchema.safeParse(data);
				expect(result.success).toBe(false);
			});
		});

		describe('invalid parentCommentId', () => {
			it('should reject non-UUID parentCommentId', () => {
				const data = {
					eventId: '123e4567-e89b-12d3-a456-426614174000',
					content: 'Reply comment',
					parentCommentId: 'not-a-uuid'
				};
				const result = commentCreationSchema.safeParse(data);
				expect(result.success).toBe(false);
			});

			it('should reject empty string parentCommentId', () => {
				const data = {
					eventId: '123e4567-e89b-12d3-a456-426614174000',
					content: 'Reply comment',
					parentCommentId: ''
				};
				const result = commentCreationSchema.safeParse(data);
				expect(result.success).toBe(false);
			});
		});
	});

	describe('commentEditSchema', () => {
		describe('valid edits', () => {
			it('should accept valid comment edit', () => {
				const data = {
					commentId: '123e4567-e89b-12d3-a456-426614174000',
					content: 'Updated comment content'
				};
				const result = commentEditSchema.safeParse(data);
				expect(result.success).toBe(true);
			});

			it('should accept edit with maximum length content', () => {
				const data = {
					commentId: '123e4567-e89b-12d3-a456-426614174000',
					content: 'a'.repeat(5000)
				};
				const result = commentEditSchema.safeParse(data);
				expect(result.success).toBe(true);
			});

			it('should trim whitespace from edited content', () => {
				const data = {
					commentId: '123e4567-e89b-12d3-a456-426614174000',
					content: '  Updated content  '
				};
				const result = commentEditSchema.safeParse(data);
				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data.content).toBe('Updated content');
				}
			});
		});

		describe('invalid edits', () => {
			it('should reject missing commentId', () => {
				const data = {
					content: 'Updated content'
				};
				const result = commentEditSchema.safeParse(data);
				expect(result.success).toBe(false);
			});

			it('should reject non-UUID commentId', () => {
				const data = {
					commentId: 'not-a-uuid',
					content: 'Updated content'
				};
				const result = commentEditSchema.safeParse(data);
				expect(result.success).toBe(false);
			});

			it('should reject empty content', () => {
				const data = {
					commentId: '123e4567-e89b-12d3-a456-426614174000',
					content: ''
				};
				const result = commentEditSchema.safeParse(data);
				expect(result.success).toBe(false);
			});

			it('should reject content exceeding 5000 characters', () => {
				const data = {
					commentId: '123e4567-e89b-12d3-a456-426614174000',
					content: 'a'.repeat(5001)
				};
				const result = commentEditSchema.safeParse(data);
				expect(result.success).toBe(false);
			});
		});
	});

	describe('commentDeletionSchema', () => {
		describe('valid deletions', () => {
			it('should accept valid comment deletion', () => {
				const data = {
					commentId: '123e4567-e89b-12d3-a456-426614174000'
				};
				const result = commentDeletionSchema.safeParse(data);
				expect(result.success).toBe(true);
			});
		});

		describe('invalid deletions', () => {
			it('should reject missing commentId', () => {
				const data = {};
				const result = commentDeletionSchema.safeParse(data);
				expect(result.success).toBe(false);
			});

			it('should reject non-UUID commentId', () => {
				const data = {
					commentId: 'not-a-uuid'
				};
				const result = commentDeletionSchema.safeParse(data);
				expect(result.success).toBe(false);
			});

			it('should reject empty string commentId', () => {
				const data = {
					commentId: ''
				};
				const result = commentDeletionSchema.safeParse(data);
				expect(result.success).toBe(false);
			});
		});
	});

	describe('commentQuerySchema', () => {
		describe('valid queries', () => {
			it('should accept valid event query with defaults', () => {
				const data = {
					eventId: '123e4567-e89b-12d3-a456-426614174000'
				};
				const result = commentQuerySchema.safeParse(data);
				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data.limit).toBe(50);
					expect(result.data.offset).toBe(0);
				}
			});

			it('should accept custom limit', () => {
				const data = {
					eventId: '123e4567-e89b-12d3-a456-426614174000',
					limit: 25
				};
				const result = commentQuerySchema.safeParse(data);
				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data.limit).toBe(25);
				}
			});

			it('should accept custom offset', () => {
				const data = {
					eventId: '123e4567-e89b-12d3-a456-426614174000',
					offset: 100
				};
				const result = commentQuerySchema.safeParse(data);
				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data.offset).toBe(100);
				}
			});

			it('should accept both limit and offset', () => {
				const data = {
					eventId: '123e4567-e89b-12d3-a456-426614174000',
					limit: 10,
					offset: 50
				};
				const result = commentQuerySchema.safeParse(data);
				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.data.limit).toBe(10);
					expect(result.data.offset).toBe(50);
				}
			});

			it('should accept maximum limit of 100', () => {
				const data = {
					eventId: '123e4567-e89b-12d3-a456-426614174000',
					limit: 100
				};
				const result = commentQuerySchema.safeParse(data);
				expect(result.success).toBe(true);
			});

			it('should accept minimum limit of 1', () => {
				const data = {
					eventId: '123e4567-e89b-12d3-a456-426614174000',
					limit: 1
				};
				const result = commentQuerySchema.safeParse(data);
				expect(result.success).toBe(true);
			});

			it('should accept offset of 0', () => {
				const data = {
					eventId: '123e4567-e89b-12d3-a456-426614174000',
					offset: 0
				};
				const result = commentQuerySchema.safeParse(data);
				expect(result.success).toBe(true);
			});
		});

		describe('invalid queries', () => {
			it('should reject missing eventId', () => {
				const data = {};
				const result = commentQuerySchema.safeParse(data);
				expect(result.success).toBe(false);
			});

			it('should reject non-UUID eventId', () => {
				const data = {
					eventId: 'not-a-uuid'
				};
				const result = commentQuerySchema.safeParse(data);
				expect(result.success).toBe(false);
			});

			it('should reject limit exceeding 100', () => {
				const data = {
					eventId: '123e4567-e89b-12d3-a456-426614174000',
					limit: 101
				};
				const result = commentQuerySchema.safeParse(data);
				expect(result.success).toBe(false);
			});

			it('should reject limit less than 1', () => {
				const data = {
					eventId: '123e4567-e89b-12d3-a456-426614174000',
					limit: 0
				};
				const result = commentQuerySchema.safeParse(data);
				expect(result.success).toBe(false);
			});

			it('should reject negative offset', () => {
				const data = {
					eventId: '123e4567-e89b-12d3-a456-426614174000',
					offset: -1
				};
				const result = commentQuerySchema.safeParse(data);
				expect(result.success).toBe(false);
			});

			it('should reject non-integer limit', () => {
				const data = {
					eventId: '123e4567-e89b-12d3-a456-426614174000',
					limit: 10.5
				};
				const result = commentQuerySchema.safeParse(data);
				expect(result.success).toBe(false);
			});

			it('should reject non-integer offset', () => {
				const data = {
					eventId: '123e4567-e89b-12d3-a456-426614174000',
					offset: 25.5
				};
				const result = commentQuerySchema.safeParse(data);
				expect(result.success).toBe(false);
			});
		});
	});
});
