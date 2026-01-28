import { describe, it, expect, vi, beforeEach } from 'vitest';
import { blockUser, unblockUser, getBlockedUsers, isUserBlocked } from './blocks';

const CURRENT_USER_ID = 'current-user-0000-0000-000000000001';
const TARGET_USER_ID = 'target-user-0000-0000-000000000002';
const BLOCK_RECORD_ID = 'block-id-0000-0000-0000-000000000001';

function createMockSupabase(
	sessionUserId: string | null = CURRENT_USER_ID,
	queryResult: { data: unknown; error: unknown; count?: number } = { data: null, error: null }
) {
	const selectFn = vi.fn().mockReturnValue(queryResult);
	const singleFn = vi.fn().mockReturnValue(queryResult);
	const countFn = vi.fn().mockReturnValue(queryResult);
	const orderFn = vi.fn().mockReturnValue(queryResult);
	const eqFn = vi.fn().mockReturnThis();
	const insertFn = vi.fn().mockReturnThis();
	const deleteFn = vi.fn().mockReturnThis();
	const fromFn = vi.fn().mockReturnValue({
		insert: insertFn,
		delete: deleteFn,
		select: selectFn
	});

	insertFn.mockReturnValue({ select: selectFn });
	selectFn.mockReturnValue({ single: singleFn, eq: eqFn, order: orderFn });
	deleteFn.mockReturnValue({ eq: eqFn, count: countFn });
	eqFn.mockReturnValue({ eq: eqFn, count: countFn, order: orderFn });
	singleFn.mockReturnValue(queryResult);
	orderFn.mockReturnValue(queryResult);

	return {
		supabase: {
			auth: {
				getSession: vi.fn().mockResolvedValue({
					data: {
						session: sessionUserId ? { user: { id: sessionUserId } } : null
					}
				})
			},
			from: fromFn
		},
		fromFn,
		insertFn,
		deleteFn,
		selectFn,
		eqFn,
		singleFn,
		orderFn
	};
}

describe('blockUser', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('blocks a user successfully', async () => {
		const blockRecord = {
			id: BLOCK_RECORD_ID,
			blocker_id: CURRENT_USER_ID,
			blocked_id: TARGET_USER_ID,
			blocked_at: '2026-01-28T12:00:00Z'
		};
		const { supabase } = createMockSupabase(CURRENT_USER_ID, { data: blockRecord, error: null });

		const result = await blockUser(supabase as never, TARGET_USER_ID, 'Unwanted contact');

		expect(result).toEqual(blockRecord);
	});

	it('blocks a user without reason', async () => {
		const blockRecord = {
			id: BLOCK_RECORD_ID,
			blocker_id: CURRENT_USER_ID,
			blocked_id: TARGET_USER_ID,
			blocked_at: '2026-01-28T12:00:00Z'
		};
		const { supabase } = createMockSupabase(CURRENT_USER_ID, { data: blockRecord, error: null });

		const result = await blockUser(supabase as never, TARGET_USER_ID);

		expect(result).toEqual(blockRecord);
	});

	it('throws when user is not authenticated', async () => {
		const { supabase } = createMockSupabase(null);

		await expect(blockUser(supabase as never, TARGET_USER_ID)).rejects.toThrow(
			'User must be authenticated to block'
		);
	});

	it('throws when trying to block self', async () => {
		const { supabase } = createMockSupabase(CURRENT_USER_ID);

		await expect(blockUser(supabase as never, CURRENT_USER_ID)).rejects.toThrow(
			'Cannot block yourself'
		);
	});

	it('throws when user is already blocked (unique constraint)', async () => {
		const { supabase } = createMockSupabase(CURRENT_USER_ID, {
			data: null,
			error: { code: '23505', message: 'unique violation' }
		});

		await expect(blockUser(supabase as never, TARGET_USER_ID)).rejects.toThrow(
			'User is already blocked'
		);
	});

	it('throws with database error message on other errors', async () => {
		const { supabase } = createMockSupabase(CURRENT_USER_ID, {
			data: null,
			error: { code: '50000', message: 'connection timeout' }
		});

		await expect(blockUser(supabase as never, TARGET_USER_ID)).rejects.toThrow(
			'Failed to block user: connection timeout'
		);
	});
});

describe('unblockUser', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	const createUnblockMock = (
		sessionUserId: string | null,
		existingBlock: { id: string } | null,
		deleteError: unknown = null
	) => {
		const singleFn = vi.fn().mockReturnValue({ data: existingBlock, error: null });
		const eqFn = vi.fn();
		const selectFn = vi.fn().mockReturnValue({ eq: eqFn });
		const deleteFn = vi.fn().mockReturnValue({ eq: eqFn });
		const fromFn = vi.fn().mockReturnValue({ select: selectFn, delete: deleteFn });

		// First eq returns object with second eq; second eq returns { single } or { eq }
		let eqCallCount = 0;
		eqFn.mockImplementation(() => {
			eqCallCount++;
			if (eqCallCount === 2) {
				// After second eq on select chain, return { single }
				return { single: singleFn };
			}
			if (eqCallCount === 4) {
				// After second eq on delete chain
				return { data: null, error: deleteError };
			}
			return { eq: eqFn, single: singleFn };
		});

		return {
			supabase: {
				auth: {
					getSession: vi.fn().mockResolvedValue({
						data: {
							session: sessionUserId ? { user: { id: sessionUserId } } : null
						}
					})
				},
				from: fromFn
			}
		};
	};

	it('unblocks a user successfully', async () => {
		const { supabase } = createUnblockMock(CURRENT_USER_ID, { id: BLOCK_RECORD_ID }, null);

		await expect(unblockUser(supabase as never, TARGET_USER_ID)).resolves.toBeUndefined();
	});

	it('throws when user is not authenticated', async () => {
		const { supabase } = createUnblockMock(null, null, null);

		await expect(unblockUser(supabase as never, TARGET_USER_ID)).rejects.toThrow(
			'User must be authenticated to unblock'
		);
	});

	it('throws when user was not blocked', async () => {
		const { supabase } = createUnblockMock(CURRENT_USER_ID, null, null);

		await expect(unblockUser(supabase as never, TARGET_USER_ID)).rejects.toThrow(
			'User was not blocked'
		);
	});

	it('throws with database error message', async () => {
		const { supabase } = createUnblockMock(
			CURRENT_USER_ID,
			{ id: BLOCK_RECORD_ID },
			{ code: '50000', message: 'database unavailable' }
		);

		await expect(unblockUser(supabase as never, TARGET_USER_ID)).rejects.toThrow(
			'Failed to unblock user: database unavailable'
		);
	});
});

describe('getBlockedUsers', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns blocked users with display names', async () => {
		const dbRows = [
			{
				id: BLOCK_RECORD_ID,
				blocked_id: TARGET_USER_ID,
				reason: 'Spam messages',
				blocked_at: '2026-01-28T12:00:00Z',
				users: { display_name: 'Jane Smith' }
			}
		];
		const { supabase } = createMockSupabase(CURRENT_USER_ID, { data: dbRows, error: null });

		const result = await getBlockedUsers(supabase as never);

		expect(result).toHaveLength(1);
		expect(result[0]).toEqual({
			id: BLOCK_RECORD_ID,
			blockedId: TARGET_USER_ID,
			displayName: 'Jane Smith',
			reason: 'Spam messages',
			blockedAt: '2026-01-28T12:00:00Z'
		});
	});

	it('returns empty array when no users are blocked', async () => {
		const { supabase } = createMockSupabase(CURRENT_USER_ID, { data: [], error: null });

		const result = await getBlockedUsers(supabase as never);

		expect(result).toHaveLength(0);
	});

	it('handles null display name gracefully', async () => {
		const dbRows = [
			{
				id: BLOCK_RECORD_ID,
				blocked_id: TARGET_USER_ID,
				reason: null,
				blocked_at: '2026-01-28T12:00:00Z',
				users: { display_name: null }
			}
		];
		const { supabase } = createMockSupabase(CURRENT_USER_ID, { data: dbRows, error: null });

		const result = await getBlockedUsers(supabase as never);

		expect(result[0].displayName).toBeNull();
		expect(result[0].reason).toBeNull();
	});

	it('throws when user is not authenticated', async () => {
		const { supabase } = createMockSupabase(null);

		await expect(getBlockedUsers(supabase as never)).rejects.toThrow('User must be authenticated');
	});

	it('throws with database error message', async () => {
		const { supabase } = createMockSupabase(CURRENT_USER_ID, {
			data: null,
			error: { code: '50000', message: 'query failed' }
		});

		await expect(getBlockedUsers(supabase as never)).rejects.toThrow(
			'Failed to fetch blocked users: query failed'
		);
	});
});

describe('isUserBlocked', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	const createIsBlockedMock = (
		sessionUserId: string | null,
		count: number | null,
		error: unknown = null
	) => {
		const eqFn = vi.fn();
		const selectFn = vi.fn().mockReturnValue({ eq: eqFn });
		const fromFn = vi.fn().mockReturnValue({ select: selectFn });
		eqFn.mockReturnValue({ eq: eqFn, count, error });

		return {
			supabase: {
				auth: {
					getSession: vi.fn().mockResolvedValue({
						data: {
							session: sessionUserId ? { user: { id: sessionUserId } } : null
						}
					})
				},
				from: fromFn
			}
		};
	};

	it('returns true when user is blocked', async () => {
		const { supabase } = createIsBlockedMock(CURRENT_USER_ID, 1);

		const result = await isUserBlocked(supabase as never, TARGET_USER_ID);

		expect(result).toBe(true);
	});

	it('returns false when user is not blocked', async () => {
		const { supabase } = createIsBlockedMock(CURRENT_USER_ID, 0);

		const result = await isUserBlocked(supabase as never, TARGET_USER_ID);

		expect(result).toBe(false);
	});

	it('returns false when user is not authenticated', async () => {
		const { supabase } = createIsBlockedMock(null, 0);

		const result = await isUserBlocked(supabase as never, TARGET_USER_ID);

		expect(result).toBe(false);
	});

	it('returns false on database error', async () => {
		const { supabase } = createIsBlockedMock(CURRENT_USER_ID, null, {
			code: '50000',
			message: 'connection failed'
		});

		const result = await isUserBlocked(supabase as never, TARGET_USER_ID);

		expect(result).toBe(false);
	});
});
