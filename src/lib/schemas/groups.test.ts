/**
 * Tests for group validation schemas
 */

import { describe, it, expect } from 'vitest';
import {
	groupCreateSchema,
	groupUpdateSchema,
	joinRequestSchema,
	memberRoleUpdateSchema,
	joinRequestResponseSchema,
	memberRemovalSchema
} from './groups';

describe('groupCreateSchema', () => {
	describe('name validation', () => {
		it('should accept valid group names', () => {
			const result = groupCreateSchema.parse({
				name: 'Tech Enthusiasts',
				topic_ids: ['550e8400-e29b-41d4-a716-446655440000']
			});
			expect(result.name).toBe('Tech Enthusiasts');
		});

		it('should reject names under 3 characters', () => {
			expect(() =>
				groupCreateSchema.parse({
					name: 'AB',
					topic_ids: ['550e8400-e29b-41d4-a716-446655440000']
				})
			).toThrow('Group name must be at least 3 characters');
		});

		it('should reject names over 100 characters', () => {
			const longName = 'A'.repeat(101);
			expect(() =>
				groupCreateSchema.parse({
					name: longName,
					topic_ids: ['550e8400-e29b-41d4-a716-446655440000']
				})
			).toThrow('Group name must be at most 100 characters');
		});

		it('should trim whitespace from names', () => {
			const result = groupCreateSchema.parse({
				name: '  Tech Group  ',
				topic_ids: ['550e8400-e29b-41d4-a716-446655440000']
			});
			expect(result.name).toBe('Tech Group');
		});
	});

	describe('description validation', () => {
		it('should accept valid descriptions', () => {
			const result = groupCreateSchema.parse({
				name: 'Tech Group',
				description: 'A group for tech enthusiasts',
				topic_ids: ['550e8400-e29b-41d4-a716-446655440000']
			});
			expect(result.description).toBe('A group for tech enthusiasts');
		});

		it('should accept null descriptions', () => {
			const result = groupCreateSchema.parse({
				name: 'Tech Group',
				description: null,
				topic_ids: ['550e8400-e29b-41d4-a716-446655440000']
			});
			expect(result.description).toBeNull();
		});

		it('should accept undefined descriptions', () => {
			const result = groupCreateSchema.parse({
				name: 'Tech Group',
				topic_ids: ['550e8400-e29b-41d4-a716-446655440000']
			});
			expect(result.description).toBeUndefined();
		});

		it('should reject descriptions over 2000 characters', () => {
			const longDesc = 'A'.repeat(2001);
			expect(() =>
				groupCreateSchema.parse({
					name: 'Tech Group',
					description: longDesc,
					topic_ids: ['550e8400-e29b-41d4-a716-446655440000']
				})
			).toThrow('Description must be at most 2000 characters');
		});

		it('should trim whitespace from descriptions', () => {
			const result = groupCreateSchema.parse({
				name: 'Tech Group',
				description: '  Great group  ',
				topic_ids: ['550e8400-e29b-41d4-a716-446655440000']
			});
			expect(result.description).toBe('Great group');
		});
	});

	describe('group_type validation', () => {
		it('should default to public', () => {
			const result = groupCreateSchema.parse({
				name: 'Tech Group',
				topic_ids: ['550e8400-e29b-41d4-a716-446655440000']
			});
			expect(result.group_type).toBe('public');
		});

		it('should accept public type', () => {
			const result = groupCreateSchema.parse({
				name: 'Tech Group',
				group_type: 'public',
				topic_ids: ['550e8400-e29b-41d4-a716-446655440000']
			});
			expect(result.group_type).toBe('public');
		});

		it('should accept private type', () => {
			const result = groupCreateSchema.parse({
				name: 'Tech Group',
				group_type: 'private',
				topic_ids: ['550e8400-e29b-41d4-a716-446655440000']
			});
			expect(result.group_type).toBe('private');
		});

		it('should reject invalid group types', () => {
			expect(() =>
				groupCreateSchema.parse({
					name: 'Tech Group',
					group_type: 'secret',
					topic_ids: ['550e8400-e29b-41d4-a716-446655440000']
				})
			).toThrow();
		});
	});

	describe('topic_ids validation', () => {
		it('should accept valid topic IDs', () => {
			const result = groupCreateSchema.parse({
				name: 'Tech Group',
				topic_ids: ['550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001']
			});
			expect(result.topic_ids).toHaveLength(2);
		});

		it('should require at least 1 topic', () => {
			expect(() =>
				groupCreateSchema.parse({
					name: 'Tech Group',
					topic_ids: []
				})
			).toThrow('At least 1 topic is required');
		});

		it('should allow maximum 5 topics', () => {
			const result = groupCreateSchema.parse({
				name: 'Tech Group',
				topic_ids: [
					'550e8400-e29b-41d4-a716-446655440000',
					'550e8400-e29b-41d4-a716-446655440001',
					'550e8400-e29b-41d4-a716-446655440002',
					'550e8400-e29b-41d4-a716-446655440003',
					'550e8400-e29b-41d4-a716-446655440004'
				]
			});
			expect(result.topic_ids).toHaveLength(5);
		});

		it('should reject more than 5 topics', () => {
			expect(() =>
				groupCreateSchema.parse({
					name: 'Tech Group',
					topic_ids: [
						'550e8400-e29b-41d4-a716-446655440000',
						'550e8400-e29b-41d4-a716-446655440001',
						'550e8400-e29b-41d4-a716-446655440002',
						'550e8400-e29b-41d4-a716-446655440003',
						'550e8400-e29b-41d4-a716-446655440004',
						'550e8400-e29b-41d4-a716-446655440005'
					]
				})
			).toThrow('Maximum 5 topics allowed');
		});

		it('should reject invalid UUIDs', () => {
			expect(() =>
				groupCreateSchema.parse({
					name: 'Tech Group',
					topic_ids: ['not-a-uuid']
				})
			).toThrow('Invalid topic ID');
		});
	});

	describe('location validation', () => {
		it('should accept valid locations', () => {
			const result = groupCreateSchema.parse({
				name: 'Tech Group',
				location: 'San Francisco, CA',
				topic_ids: ['550e8400-e29b-41d4-a716-446655440000']
			});
			expect(result.location).toBe('San Francisco, CA');
		});

		it('should accept null locations', () => {
			const result = groupCreateSchema.parse({
				name: 'Tech Group',
				location: null,
				topic_ids: ['550e8400-e29b-41d4-a716-446655440000']
			});
			expect(result.location).toBeNull();
		});

		it('should trim whitespace from locations', () => {
			const result = groupCreateSchema.parse({
				name: 'Tech Group',
				location: '  Boston  ',
				topic_ids: ['550e8400-e29b-41d4-a716-446655440000']
			});
			expect(result.location).toBe('Boston');
		});
	});

	describe('cover_image_url validation', () => {
		it('should accept valid URLs', () => {
			const result = groupCreateSchema.parse({
				name: 'Tech Group',
				cover_image_url: 'https://example.com/image.jpg',
				topic_ids: ['550e8400-e29b-41d4-a716-446655440000']
			});
			expect(result.cover_image_url).toBe('https://example.com/image.jpg');
		});

		it('should reject invalid URLs', () => {
			expect(() =>
				groupCreateSchema.parse({
					name: 'Tech Group',
					cover_image_url: 'not-a-url',
					topic_ids: ['550e8400-e29b-41d4-a716-446655440000']
				})
			).toThrow('Invalid image URL');
		});

		it('should accept null URLs', () => {
			const result = groupCreateSchema.parse({
				name: 'Tech Group',
				cover_image_url: null,
				topic_ids: ['550e8400-e29b-41d4-a716-446655440000']
			});
			expect(result.cover_image_url).toBeNull();
		});
	});
});

describe('groupUpdateSchema', () => {
	it('should accept partial updates', () => {
		const result = groupUpdateSchema.parse({
			name: 'Updated Name'
		});
		expect(result.name).toBe('Updated Name');
	});

	it('should accept empty objects', () => {
		const result = groupUpdateSchema.parse({});
		expect(result).toEqual({});
	});

	it('should validate name if provided', () => {
		expect(() =>
			groupUpdateSchema.parse({
				name: 'AB'
			})
		).toThrow('Group name must be at least 3 characters');
	});

	it('should validate topic_ids if provided', () => {
		expect(() =>
			groupUpdateSchema.parse({
				topic_ids: []
			})
		).toThrow('At least 1 topic is required');
	});
});

describe('joinRequestSchema', () => {
	it('should accept valid join requests', () => {
		const result = joinRequestSchema.parse({
			group_id: '550e8400-e29b-41d4-a716-446655440000',
			message: 'I would like to join this group'
		});
		expect(result.group_id).toBe('550e8400-e29b-41d4-a716-446655440000');
		expect(result.message).toBe('I would like to join this group');
	});

	it('should accept requests without messages', () => {
		const result = joinRequestSchema.parse({
			group_id: '550e8400-e29b-41d4-a716-446655440000'
		});
		expect(result.message).toBeUndefined();
	});

	it('should reject invalid group IDs', () => {
		expect(() =>
			joinRequestSchema.parse({
				group_id: 'invalid-uuid'
			})
		).toThrow('Invalid group ID');
	});

	it('should reject messages over 500 characters', () => {
		const longMessage = 'A'.repeat(501);
		expect(() =>
			joinRequestSchema.parse({
				group_id: '550e8400-e29b-41d4-a716-446655440000',
				message: longMessage
			})
		).toThrow('Message must be at most 500 characters');
	});

	it('should trim whitespace from messages', () => {
		const result = joinRequestSchema.parse({
			group_id: '550e8400-e29b-41d4-a716-446655440000',
			message: '  Please let me join  '
		});
		expect(result.message).toBe('Please let me join');
	});
});

describe('memberRoleUpdateSchema', () => {
	it('should accept valid role updates', () => {
		const result = memberRoleUpdateSchema.parse({
			member_id: '550e8400-e29b-41d4-a716-446655440000',
			role: 'co_organizer'
		});
		expect(result.role).toBe('co_organizer');
	});

	it('should accept all valid roles', () => {
		const roles = [
			'organizer',
			'co_organizer',
			'assistant_organizer',
			'event_organizer',
			'member'
		] as const;
		roles.forEach((role) => {
			const result = memberRoleUpdateSchema.parse({
				member_id: '550e8400-e29b-41d4-a716-446655440000',
				role
			});
			expect(result.role).toBe(role);
		});
	});

	it('should reject invalid roles', () => {
		expect(() =>
			memberRoleUpdateSchema.parse({
				member_id: '550e8400-e29b-41d4-a716-446655440000',
				role: 'admin'
			})
		).toThrow();
	});

	it('should reject invalid member IDs', () => {
		expect(() =>
			memberRoleUpdateSchema.parse({
				member_id: 'invalid-uuid',
				role: 'member'
			})
		).toThrow('Invalid member ID');
	});
});

describe('joinRequestResponseSchema', () => {
	it('should accept approval responses', () => {
		const result = joinRequestResponseSchema.parse({
			member_id: '550e8400-e29b-41d4-a716-446655440000',
			approve: true
		});
		expect(result.approve).toBe(true);
	});

	it('should accept denial responses', () => {
		const result = joinRequestResponseSchema.parse({
			member_id: '550e8400-e29b-41d4-a716-446655440000',
			approve: false,
			message: 'Sorry, not a good fit'
		});
		expect(result.approve).toBe(false);
		expect(result.message).toBe('Sorry, not a good fit');
	});

	it('should accept responses without messages', () => {
		const result = joinRequestResponseSchema.parse({
			member_id: '550e8400-e29b-41d4-a716-446655440000',
			approve: true
		});
		expect(result.message).toBeUndefined();
	});

	it('should reject messages over 500 characters', () => {
		const longMessage = 'A'.repeat(501);
		expect(() =>
			joinRequestResponseSchema.parse({
				member_id: '550e8400-e29b-41d4-a716-446655440000',
				approve: false,
				message: longMessage
			})
		).toThrow('Message must be at most 500 characters');
	});
});

describe('memberRemovalSchema', () => {
	it('should accept member removal', () => {
		const result = memberRemovalSchema.parse({
			member_id: '550e8400-e29b-41d4-a716-446655440000',
			ban: false,
			reason: 'Inactive'
		});
		expect(result.ban).toBe(false);
		expect(result.reason).toBe('Inactive');
	});

	it('should accept bans', () => {
		const result = memberRemovalSchema.parse({
			member_id: '550e8400-e29b-41d4-a716-446655440000',
			ban: true,
			reason: 'Violated community guidelines'
		});
		expect(result.ban).toBe(true);
	});

	it('should default ban to false', () => {
		const result = memberRemovalSchema.parse({
			member_id: '550e8400-e29b-41d4-a716-446655440000'
		});
		expect(result.ban).toBe(false);
	});

	it('should accept removals without reasons', () => {
		const result = memberRemovalSchema.parse({
			member_id: '550e8400-e29b-41d4-a716-446655440000',
			ban: false
		});
		expect(result.reason).toBeUndefined();
	});

	it('should reject reasons over 500 characters', () => {
		const longReason = 'A'.repeat(501);
		expect(() =>
			memberRemovalSchema.parse({
				member_id: '550e8400-e29b-41d4-a716-446655440000',
				ban: true,
				reason: longReason
			})
		).toThrow('Reason must be at most 500 characters');
	});

	it('should reject invalid member IDs', () => {
		expect(() =>
			memberRemovalSchema.parse({
				member_id: 'invalid-uuid',
				ban: false
			})
		).toThrow('Invalid member ID');
	});

	it('should trim whitespace from reasons', () => {
		const result = memberRemovalSchema.parse({
			member_id: '550e8400-e29b-41d4-a716-446655440000',
			ban: true,
			reason: '  Spam  '
		});
		expect(result.reason).toBe('Spam');
	});
});
