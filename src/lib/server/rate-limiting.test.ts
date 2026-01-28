import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	checkRateLimit,
	recordMessageSend,
	getRateLimitHistory,
	getPendingRateLimitAlerts,
	markAlertReviewed
} from './rate-limiting';

describe('checkRateLimit', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	const createMockSupabase = (rpcResult: { data: unknown; error: unknown }) => ({
		rpc: vi.fn().mockResolvedValue(rpcResult)
	});

	it('returns allowed for a user within limits', async () => {
		const supabase = createMockSupabase({ data: 'allowed', error: null });

		const result = await checkRateLimit(supabase as never, 'user-123');

		expect(result).toBe('allowed');
		expect(supabase.rpc).toHaveBeenCalledWith('check_rate_limit', { p_user_id: 'user-123' });
	});

	it('returns warned when user is approaching limit', async () => {
		const supabase = createMockSupabase({ data: 'warned', error: null });

		const result = await checkRateLimit(supabase as never, 'user-456');

		expect(result).toBe('warned');
	});

	it('returns throttled when user exceeded limit', async () => {
		const supabase = createMockSupabase({ data: 'throttled', error: null });

		const result = await checkRateLimit(supabase as never, 'user-789');

		expect(result).toBe('throttled');
	});

	it('returns suspended for repeated violations', async () => {
		const supabase = createMockSupabase({ data: 'suspended', error: null });

		const result = await checkRateLimit(supabase as never, 'user-suspended');

		expect(result).toBe('suspended');
	});

	it('throws on RPC error', async () => {
		const supabase = createMockSupabase({ data: null, error: { message: 'RPC failed' } });

		await expect(checkRateLimit(supabase as never, 'user-123')).rejects.toThrow(
			'Failed to check rate limit'
		);
	});

	it('passes the correct user ID to the RPC function', async () => {
		const supabase = createMockSupabase({ data: 'allowed', error: null });
		const testUserId = '550e8400-e29b-41d4-a716-446655440000';

		await checkRateLimit(supabase as never, testUserId);

		expect(supabase.rpc).toHaveBeenCalledWith('check_rate_limit', { p_user_id: testUserId });
	});
});

describe('recordMessageSend', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	const createMockSupabase = (rpcResult: { data: unknown; error: unknown }) => ({
		rpc: vi.fn().mockResolvedValue(rpcResult)
	});

	it('returns allowed for messages within limits', async () => {
		const supabase = createMockSupabase({ data: 'allowed', error: null });

		const result = await recordMessageSend(supabase as never, 'user-123');

		expect(result).toBe('allowed');
		expect(supabase.rpc).toHaveBeenCalledWith('record_message_send', { p_user_id: 'user-123' });
	});

	it('returns warned when approaching the limit', async () => {
		const supabase = createMockSupabase({ data: 'warned', error: null });

		const result = await recordMessageSend(supabase as never, 'user-123');

		expect(result).toBe('warned');
	});

	it('returns throttled when rate limit exceeded', async () => {
		const supabase = createMockSupabase({ data: 'throttled', error: null });

		const result = await recordMessageSend(supabase as never, 'user-123');

		expect(result).toBe('throttled');
	});

	it('returns suspended after repeated violations', async () => {
		const supabase = createMockSupabase({ data: 'suspended', error: null });

		const result = await recordMessageSend(supabase as never, 'user-123');

		expect(result).toBe('suspended');
	});

	it('throws on RPC error', async () => {
		const supabase = createMockSupabase({ data: null, error: { message: 'Database error' } });

		await expect(recordMessageSend(supabase as never, 'user-123')).rejects.toThrow(
			'Failed to record message send'
		);
	});

	it('calls RPC with correct user ID', async () => {
		const supabase = createMockSupabase({ data: 'allowed', error: null });
		const userId = '550e8400-e29b-41d4-a716-446655440000';

		await recordMessageSend(supabase as never, userId);

		expect(supabase.rpc).toHaveBeenCalledWith('record_message_send', { p_user_id: userId });
	});
});

describe('getRateLimitHistory', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	const createMockSupabase = (
		userId: string | null,
		queryResult: { data: unknown; error: unknown }
	) => ({
		auth: {
			getSession: vi.fn().mockResolvedValue({
				data: { session: userId ? { user: { id: userId } } : null }
			})
		},
		from: vi.fn(() => ({
			select: vi.fn(() => ({
				eq: vi.fn(() => ({
					order: vi.fn(() => ({
						limit: vi.fn().mockResolvedValue(queryResult)
					}))
				}))
			}))
		}))
	});

	it('returns rate limit history for authenticated user', async () => {
		const mockData = [
			{
				id: 'record-1',
				user_id: 'user-123',
				message_count: 5,
				window_start: '2026-01-28T10:00:00.000Z',
				window_end: '2026-01-28T11:00:00.000Z',
				action_taken: 'allowed',
				created_at: '2026-01-28T10:30:00.000Z'
			},
			{
				id: 'record-2',
				user_id: 'user-123',
				message_count: 8,
				window_start: '2026-01-28T09:00:00.000Z',
				window_end: '2026-01-28T10:00:00.000Z',
				action_taken: 'warned',
				created_at: '2026-01-28T09:45:00.000Z'
			}
		];

		const supabase = createMockSupabase('user-123', { data: mockData, error: null });

		const result = await getRateLimitHistory(supabase as never);

		expect(result).toHaveLength(2);
		expect(result[0].id).toBe('record-1');
		expect(result[0].userId).toBe('user-123');
		expect(result[0].messageCount).toBe(5);
		expect(result[0].actionTaken).toBe('allowed');
		expect(result[1].actionTaken).toBe('warned');
	});

	it('returns empty array when no history exists', async () => {
		const supabase = createMockSupabase('user-123', { data: [], error: null });

		const result = await getRateLimitHistory(supabase as never);

		expect(result).toHaveLength(0);
	});

	it('throws when user is not authenticated', async () => {
		const supabase = createMockSupabase(null, { data: [], error: null });

		await expect(getRateLimitHistory(supabase as never)).rejects.toThrow(
			'User must be authenticated'
		);
	});

	it('throws on database error', async () => {
		const supabase = createMockSupabase('user-123', {
			data: null,
			error: { message: 'Connection failed' }
		});

		await expect(getRateLimitHistory(supabase as never)).rejects.toThrow(
			'Failed to fetch rate limit history'
		);
	});

	it('maps all action types correctly', async () => {
		const mockData = [
			{
				id: 'r-1',
				user_id: 'user-123',
				message_count: 3,
				window_start: '2026-01-28T10:00:00.000Z',
				window_end: '2026-01-28T11:00:00.000Z',
				action_taken: 'warned',
				created_at: '2026-01-28T10:00:00.000Z'
			},
			{
				id: 'r-2',
				user_id: 'user-123',
				message_count: 11,
				window_start: '2026-01-28T09:00:00.000Z',
				window_end: '2026-01-28T10:00:00.000Z',
				action_taken: 'throttled',
				created_at: '2026-01-28T09:00:00.000Z'
			},
			{
				id: 'r-3',
				user_id: 'user-123',
				message_count: 15,
				window_start: '2026-01-28T08:00:00.000Z',
				window_end: '2026-01-28T09:00:00.000Z',
				action_taken: 'suspended',
				created_at: '2026-01-28T08:00:00.000Z'
			}
		];

		const supabase = createMockSupabase('user-123', { data: mockData, error: null });

		const result = await getRateLimitHistory(supabase as never);

		expect(result[0].actionTaken).toBe('warned');
		expect(result[1].actionTaken).toBe('throttled');
		expect(result[2].actionTaken).toBe('suspended');
	});

	it('queries the correct table and applies user filter', async () => {
		const fromFn = vi.fn(() => ({
			select: vi.fn(() => ({
				eq: vi.fn(() => ({
					order: vi.fn(() => ({
						limit: vi.fn().mockResolvedValue({ data: [], error: null })
					}))
				}))
			}))
		}));

		const supabase = {
			auth: {
				getSession: vi.fn().mockResolvedValue({
					data: { session: { user: { id: 'user-123' } } }
				})
			},
			from: fromFn
		};

		await getRateLimitHistory(supabase as never);

		expect(fromFn).toHaveBeenCalledWith('message_rate_limits');
	});
});

describe('getPendingRateLimitAlerts', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	const createMockSupabase = (queryResult: { data: unknown; error: unknown }) => ({
		from: vi.fn(() => ({
			select: vi.fn(() => ({
				eq: vi.fn(() => ({
					order: vi.fn().mockResolvedValue(queryResult)
				}))
			}))
		}))
	});

	it('returns pending alerts for admin review', async () => {
		const mockData = [
			{
				id: 'alert-1',
				user_id: 'user-123',
				alert_type: 'mass_messaging',
				details: 'User sent 12 messages in 1 hour',
				messages_in_window: 12,
				window_start: '2026-01-28T10:00:00.000Z',
				window_end: '2026-01-28T11:00:00.000Z',
				reviewed: false,
				created_at: '2026-01-28T10:30:00.000Z'
			}
		];

		const supabase = createMockSupabase({ data: mockData, error: null });

		const result = await getPendingRateLimitAlerts(supabase as never);

		expect(result).toHaveLength(1);
		expect(result[0].alertType).toBe('mass_messaging');
		expect(result[0].messagesInWindow).toBe(12);
		expect(result[0].reviewed).toBe(false);
	});

	it('returns empty array when no pending alerts', async () => {
		const supabase = createMockSupabase({ data: [], error: null });

		const result = await getPendingRateLimitAlerts(supabase as never);

		expect(result).toHaveLength(0);
	});

	it('throws on database error', async () => {
		const supabase = createMockSupabase({ data: null, error: { message: 'Query failed' } });

		await expect(getPendingRateLimitAlerts(supabase as never)).rejects.toThrow(
			'Failed to fetch rate limit alerts'
		);
	});

	it('maps all alert fields correctly', async () => {
		const mockData = [
			{
				id: 'alert-suspension',
				user_id: 'user-bad',
				alert_type: 'suspension',
				details: 'User suspended after repeated violations',
				messages_in_window: 20,
				window_start: '2026-01-28T10:00:00.000Z',
				window_end: '2026-01-28T11:00:00.000Z',
				reviewed: false,
				created_at: '2026-01-28T10:50:00.000Z'
			}
		];

		const supabase = createMockSupabase({ data: mockData, error: null });

		const result = await getPendingRateLimitAlerts(supabase as never);

		expect(result[0].id).toBe('alert-suspension');
		expect(result[0].userId).toBe('user-bad');
		expect(result[0].alertType).toBe('suspension');
		expect(result[0].details).toBe('User suspended after repeated violations');
		expect(result[0].messagesInWindow).toBe(20);
	});

	it('queries only unreviewed alerts', async () => {
		const eqFn = vi.fn(() => ({
			order: vi.fn().mockResolvedValue({ data: [], error: null })
		}));

		const supabase = {
			from: vi.fn(() => ({
				select: vi.fn(() => ({
					eq: eqFn
				}))
			}))
		};

		await getPendingRateLimitAlerts(supabase as never);

		expect(eqFn).toHaveBeenCalledWith('reviewed', false);
	});
});

describe('markAlertReviewed', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('successfully marks an alert as reviewed', async () => {
		const supabase = {
			from: vi.fn(() => ({
				update: vi.fn(() => ({
					eq: vi.fn().mockResolvedValue({ error: null })
				}))
			}))
		};

		await markAlertReviewed(supabase as never, 'alert-123');

		expect(supabase.from).toHaveBeenCalledWith('rate_limit_alerts');
	});

	it('throws on database error', async () => {
		const supabase = {
			from: vi.fn(() => ({
				update: vi.fn(() => ({
					eq: vi.fn().mockResolvedValue({ error: { message: 'Update failed' } })
				}))
			}))
		};

		await expect(markAlertReviewed(supabase as never, 'alert-123')).rejects.toThrow(
			'Failed to mark alert as reviewed'
		);
	});

	it('passes the correct alert ID', async () => {
		const eqFn = vi.fn().mockResolvedValue({ error: null });

		const supabase = {
			from: vi.fn(() => ({
				update: vi.fn(() => ({
					eq: eqFn
				}))
			}))
		};

		await markAlertReviewed(supabase as never, '550e8400-e29b-41d4-a716-446655440000');

		expect(eqFn).toHaveBeenCalledWith('id', '550e8400-e29b-41d4-a716-446655440000');
	});

	it('updates with reviewed: true', async () => {
		const updateFn = vi.fn(() => ({
			eq: vi.fn().mockResolvedValue({ error: null })
		}));

		const supabase = {
			from: vi.fn(() => ({
				update: updateFn
			}))
		};

		await markAlertReviewed(supabase as never, 'alert-123');

		expect(updateFn).toHaveBeenCalledWith({ reviewed: true });
	});
});
