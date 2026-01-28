import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchMessagingPreference, updateMessagingPreference } from './messaging-preferences';

describe('fetchMessagingPreference', () => {
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
					single: vi.fn().mockResolvedValue(queryResult)
				}))
			}))
		}))
	});

	it('returns user messaging preference when one exists', async () => {
		const supabase = createMockSupabase('user-123', {
			data: { allow_dm_from: 'connections' },
			error: null
		});

		const result = await fetchMessagingPreference(supabase as never);

		expect(result).toEqual({ allowDmFrom: 'connections' });
	});

	it('returns default (anyone) when no preference exists (PGRST116)', async () => {
		const supabase = createMockSupabase('user-123', {
			data: null,
			error: { code: 'PGRST116', message: 'No rows found' }
		});

		const result = await fetchMessagingPreference(supabase as never);

		expect(result).toEqual({ allowDmFrom: 'anyone' });
	});

	it('throws when user is not authenticated', async () => {
		const supabase = createMockSupabase(null, { data: null, error: null });

		await expect(fetchMessagingPreference(supabase as never)).rejects.toThrow(
			'User must be authenticated'
		);
	});

	it('throws on database error other than PGRST116', async () => {
		const supabase = createMockSupabase('user-123', {
			data: null,
			error: { code: '50000', message: 'Internal error' }
		});

		await expect(fetchMessagingPreference(supabase as never)).rejects.toThrow(
			'Failed to fetch messaging preferences'
		);
	});

	it('correctly maps all permission values', async () => {
		const permissions = ['anyone', 'connections', 'attendees', 'organizers'];

		for (const perm of permissions) {
			const supabase = createMockSupabase('user-123', {
				data: { allow_dm_from: perm },
				error: null
			});

			const result = await fetchMessagingPreference(supabase as never);
			expect(result.allowDmFrom).toBe(perm);
		}
	});
});

describe('updateMessagingPreference', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	const createMockSupabase = (
		userId: string | null,
		upsertResult: { data: unknown; error: unknown }
	) => ({
		auth: {
			getSession: vi.fn().mockResolvedValue({
				data: { session: userId ? { user: { id: userId } } : null }
			})
		},
		from: vi.fn(() => ({
			upsert: vi.fn(() => ({
				select: vi.fn(() => ({
					single: vi.fn().mockResolvedValue(upsertResult)
				}))
			}))
		}))
	});

	it('successfully updates messaging preference', async () => {
		const supabase = createMockSupabase('user-123', {
			data: { allow_dm_from: 'attendees' },
			error: null
		});

		const result = await updateMessagingPreference(supabase as never, 'attendees');

		expect(result).toEqual({ allowDmFrom: 'attendees' });
	});

	it('upserts with correct user_id and allow_dm_from', async () => {
		const upsertFn = vi.fn(() => ({
			select: vi.fn(() => ({
				single: vi.fn().mockResolvedValue({
					data: { allow_dm_from: 'organizers' },
					error: null
				})
			}))
		}));

		const supabase = {
			auth: {
				getSession: vi.fn().mockResolvedValue({
					data: { session: { user: { id: 'user-123' } } }
				})
			},
			from: vi.fn(() => ({ upsert: upsertFn }))
		};

		await updateMessagingPreference(supabase as never, 'organizers');

		expect(supabase.from).toHaveBeenCalledWith('messaging_preferences');
		expect(upsertFn).toHaveBeenCalledWith(
			{ user_id: 'user-123', allow_dm_from: 'organizers' },
			{ onConflict: 'user_id' }
		);
	});

	it('throws when user is not authenticated', async () => {
		const supabase = createMockSupabase(null, { data: null, error: null });

		await expect(updateMessagingPreference(supabase as never, 'anyone')).rejects.toThrow(
			'User must be authenticated'
		);
	});

	it('throws on database error', async () => {
		const supabase = createMockSupabase('user-123', {
			data: null,
			error: { message: 'Constraint violation' }
		});

		await expect(updateMessagingPreference(supabase as never, 'connections')).rejects.toThrow(
			'Failed to update messaging preferences'
		);
	});

	it('handles all valid permission levels', async () => {
		const permissions = ['anyone', 'connections', 'attendees', 'organizers'];

		for (const perm of permissions) {
			const supabase = createMockSupabase('user-123', {
				data: { allow_dm_from: perm },
				error: null
			});

			const result = await updateMessagingPreference(supabase as never, perm as never);
			expect(result.allowDmFrom).toBe(perm);
		}
	});
});
