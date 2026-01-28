import { describe, it, expect } from 'vitest';
import { blockUserSchema, unblockUserSchema } from './blocks';

describe('blockUserSchema', () => {
	it('validates a valid block request with reason', () => {
		const result = blockUserSchema.safeParse({
			blockedId: '550e8400-e29b-41d4-a716-446655440000',
			reason: 'Harassment via messages'
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.blockedId).toBe('550e8400-e29b-41d4-a716-446655440000');
			expect(result.data.reason).toBe('Harassment via messages');
		}
	});

	it('validates a valid block request without reason', () => {
		const result = blockUserSchema.safeParse({
			blockedId: '550e8400-e29b-41d4-a716-446655440000'
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.reason).toBeUndefined();
		}
	});

	it('transforms empty reason string to undefined', () => {
		const result = blockUserSchema.safeParse({
			blockedId: '550e8400-e29b-41d4-a716-446655440000',
			reason: ''
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.reason).toBeUndefined();
		}
	});

	it('rejects invalid UUID for blockedId', () => {
		const result = blockUserSchema.safeParse({
			blockedId: 'not-a-uuid'
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.flatten().fieldErrors.blockedId).toBeDefined();
		}
	});

	it('rejects missing blockedId', () => {
		const result = blockUserSchema.safeParse({});
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.flatten().fieldErrors.blockedId).toBeDefined();
		}
	});

	it('rejects reason exceeding 500 characters', () => {
		const result = blockUserSchema.safeParse({
			blockedId: '550e8400-e29b-41d4-a716-446655440000',
			reason: 'x'.repeat(501)
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.flatten().fieldErrors.reason).toBeDefined();
		}
	});

	it('accepts reason at exactly 500 characters', () => {
		const result = blockUserSchema.safeParse({
			blockedId: '550e8400-e29b-41d4-a716-446655440000',
			reason: 'x'.repeat(500)
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.reason?.length).toBe(500);
		}
	});
});

describe('unblockUserSchema', () => {
	it('validates a valid unblock request', () => {
		const result = unblockUserSchema.safeParse({
			blockedId: '550e8400-e29b-41d4-a716-446655440000'
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.blockedId).toBe('550e8400-e29b-41d4-a716-446655440000');
		}
	});

	it('rejects invalid UUID', () => {
		const result = unblockUserSchema.safeParse({
			blockedId: 'invalid-id'
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.flatten().fieldErrors.blockedId).toBeDefined();
		}
	});

	it('rejects missing blockedId', () => {
		const result = unblockUserSchema.safeParse({});
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.flatten().fieldErrors.blockedId).toBeDefined();
		}
	});
});
