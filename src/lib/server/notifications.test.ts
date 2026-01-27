import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	fetchUserNotificationPreferences,
	updateNotificationPreference,
	updateMultipleNotificationPreferences,
	initializeNotificationPreferences
} from './notifications';
import type { SupabaseClient } from '@supabase/supabase-js';

// Mock Supabase client
const createMockSupabaseClient = () => {
	const client = {
		from: vi.fn(),
		rpc: vi.fn()
	} as unknown as SupabaseClient;

	return client;
};

describe('fetchUserNotificationPreferences', () => {
	let mockSupabase: SupabaseClient;

	beforeEach(() => {
		mockSupabase = createMockSupabaseClient();
	});

	it('fetches and transforms notification preferences', async () => {
		const mockData = [
			{
				notification_type: 'event_reminder',
				push_enabled: true,
				email_enabled: true,
				in_app_enabled: true
			},
			{
				notification_type: 'new_message',
				push_enabled: false,
				email_enabled: true,
				in_app_enabled: true
			}
		];

		const mockFrom = vi.fn().mockReturnValue({
			select: vi.fn().mockReturnValue({
				order: vi.fn().mockResolvedValue({
					data: mockData,
					error: null
				})
			})
		});

		(mockSupabase.from as ReturnType<typeof vi.fn>) = mockFrom;

		const result = await fetchUserNotificationPreferences(mockSupabase);

		expect(mockFrom).toHaveBeenCalledWith('notification_preferences');
		expect(result).toHaveLength(2);
		expect(result[0]).toEqual({
			notificationType: 'event_reminder',
			pushEnabled: true,
			emailEnabled: true,
			inAppEnabled: true
		});
		expect(result[1]).toEqual({
			notificationType: 'new_message',
			pushEnabled: false,
			emailEnabled: true,
			inAppEnabled: true
		});
	});

	it('returns empty array when no preferences exist', async () => {
		const mockFrom = vi.fn().mockReturnValue({
			select: vi.fn().mockReturnValue({
				order: vi.fn().mockResolvedValue({
					data: [],
					error: null
				})
			})
		});

		(mockSupabase.from as ReturnType<typeof vi.fn>) = mockFrom;

		const result = await fetchUserNotificationPreferences(mockSupabase);

		expect(result).toEqual([]);
	});

	it('throws error when database query fails', async () => {
		const mockFrom = vi.fn().mockReturnValue({
			select: vi.fn().mockReturnValue({
				order: vi.fn().mockResolvedValue({
					data: null,
					error: { message: 'Database error' }
				})
			})
		});

		(mockSupabase.from as ReturnType<typeof vi.fn>) = mockFrom;

		await expect(fetchUserNotificationPreferences(mockSupabase)).rejects.toThrow(
			'Failed to fetch notification preferences'
		);
	});
});

describe('updateNotificationPreference', () => {
	let mockSupabase: SupabaseClient;

	beforeEach(() => {
		mockSupabase = createMockSupabaseClient();
	});

	it('updates a notification preference successfully', async () => {
		const mockData = {
			notification_type: 'event_reminder',
			push_enabled: false,
			email_enabled: true,
			in_app_enabled: true
		};

		const mockFrom = vi.fn().mockReturnValue({
			update: vi.fn().mockReturnValue({
				eq: vi.fn().mockReturnValue({
					select: vi.fn().mockReturnValue({
						single: vi.fn().mockResolvedValue({
							data: mockData,
							error: null
						})
					})
				})
			})
		});

		(mockSupabase.from as ReturnType<typeof vi.fn>) = mockFrom;

		const result = await updateNotificationPreference(
			mockSupabase,
			'event_reminder',
			false,
			true,
			true
		);

		expect(result).toEqual({
			notificationType: 'event_reminder',
			pushEnabled: false,
			emailEnabled: true,
			inAppEnabled: true
		});
	});

	it('throws error when update fails', async () => {
		const mockFrom = vi.fn().mockReturnValue({
			update: vi.fn().mockReturnValue({
				eq: vi.fn().mockReturnValue({
					select: vi.fn().mockReturnValue({
						single: vi.fn().mockResolvedValue({
							data: null,
							error: { message: 'Update failed' }
						})
					})
				})
			})
		});

		(mockSupabase.from as ReturnType<typeof vi.fn>) = mockFrom;

		await expect(
			updateNotificationPreference(mockSupabase, 'event_reminder', true, true, true)
		).rejects.toThrow('Failed to update notification preference');
	});

	it('throws error when preference not found', async () => {
		const mockFrom = vi.fn().mockReturnValue({
			update: vi.fn().mockReturnValue({
				eq: vi.fn().mockReturnValue({
					select: vi.fn().mockReturnValue({
						single: vi.fn().mockResolvedValue({
							data: null,
							error: null
						})
					})
				})
			})
		});

		(mockSupabase.from as ReturnType<typeof vi.fn>) = mockFrom;

		await expect(
			updateNotificationPreference(mockSupabase, 'event_reminder', true, true, true)
		).rejects.toThrow('Notification preference not found');
	});
});

describe('updateMultipleNotificationPreferences', () => {
	let mockSupabase: SupabaseClient;

	beforeEach(() => {
		mockSupabase = createMockSupabaseClient();
	});

	it('updates multiple preferences successfully', async () => {
		const mockFrom = vi.fn().mockReturnValue({
			update: vi.fn().mockReturnValue({
				eq: vi.fn().mockReturnValue({
					select: vi.fn().mockReturnValue({
						single: vi.fn().mockImplementation(async () => {
							// Return different data based on call order
							const callCount = mockFrom.mock.calls.length;
							if (callCount === 1) {
								return {
									data: {
										notification_type: 'event_reminder',
										push_enabled: true,
										email_enabled: true,
										in_app_enabled: true
									},
									error: null
								};
							} else {
								return {
									data: {
										notification_type: 'new_message',
										push_enabled: false,
										email_enabled: false,
										in_app_enabled: true
									},
									error: null
								};
							}
						})
					})
				})
			})
		});

		(mockSupabase.from as ReturnType<typeof vi.fn>) = mockFrom;

		const preferences = [
			{
				notificationType: 'event_reminder' as const,
				pushEnabled: true,
				emailEnabled: true,
				inAppEnabled: true
			},
			{
				notificationType: 'new_message' as const,
				pushEnabled: false,
				emailEnabled: false,
				inAppEnabled: true
			}
		];

		const result = await updateMultipleNotificationPreferences(mockSupabase, preferences);

		expect(result).toHaveLength(2);
	});
});

describe('initializeNotificationPreferences', () => {
	let mockSupabase: SupabaseClient;

	beforeEach(() => {
		mockSupabase = createMockSupabaseClient();
	});

	it('initializes notification preferences for a user', async () => {
		const mockRpc = vi.fn().mockResolvedValue({
			error: null
		});

		(mockSupabase.rpc as ReturnType<typeof vi.fn>) = mockRpc;

		await initializeNotificationPreferences(mockSupabase, 'user-123');

		expect(mockRpc).toHaveBeenCalledWith('initialize_notification_preferences', {
			p_user_id: 'user-123'
		});
	});

	it('throws error when initialization fails', async () => {
		const mockRpc = vi.fn().mockResolvedValue({
			error: { message: 'RPC error' }
		});

		(mockSupabase.rpc as ReturnType<typeof vi.fn>) = mockRpc;

		await expect(initializeNotificationPreferences(mockSupabase, 'user-123')).rejects.toThrow(
			'Failed to initialize notification preferences'
		);
	});
});
