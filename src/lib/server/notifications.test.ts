import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	fetchUserNotificationPreferences,
	updateNotificationPreference,
	updateMultipleNotificationPreferences,
	initializeNotificationPreferences,
	fetchNotifications,
	getUnreadNotificationCount,
	markNotificationRead,
	markAllNotificationsRead
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

describe('fetchNotifications', () => {
	let mockSupabase: SupabaseClient;

	beforeEach(() => {
		mockSupabase = createMockSupabaseClient();
		vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	it('fetches and transforms notifications', async () => {
		const mockData = [
			{
				id: 'notif-1',
				user_id: 'user-1',
				notification_type: 'event_reminder',
				title: 'Event starting soon',
				message: 'Your event starts in 1 hour',
				link: '/events/123',
				is_read: false,
				created_at: '2026-01-27T10:00:00Z',
				read_at: null
			},
			{
				id: 'notif-2',
				user_id: 'user-1',
				notification_type: 'rsvp_confirmation',
				title: 'RSVP confirmed',
				message: 'You are going to Test Event',
				link: '/events/456',
				is_read: true,
				created_at: '2026-01-26T15:00:00Z',
				read_at: '2026-01-26T16:00:00Z'
			}
		];

		const mockFrom = vi.fn().mockReturnValue({
			select: vi.fn().mockReturnValue({
				order: vi.fn().mockReturnValue({
					range: vi.fn().mockResolvedValue({
						data: mockData,
						error: null
					})
				})
			})
		});

		(mockSupabase.from as ReturnType<typeof vi.fn>) = mockFrom;

		const result = await fetchNotifications(mockSupabase, 50, 0);

		expect(mockFrom).toHaveBeenCalledWith('notifications');
		expect(result).toHaveLength(2);
		expect(result[0]).toEqual({
			id: 'notif-1',
			userId: 'user-1',
			notificationType: 'event_reminder',
			title: 'Event starting soon',
			message: 'Your event starts in 1 hour',
			link: '/events/123',
			isRead: false,
			createdAt: '2026-01-27T10:00:00Z',
			readAt: null
		});
		expect(result[1].isRead).toBe(true);
	});

	it('returns empty array when no notifications exist', async () => {
		const mockFrom = vi.fn().mockReturnValue({
			select: vi.fn().mockReturnValue({
				order: vi.fn().mockReturnValue({
					range: vi.fn().mockResolvedValue({
						data: [],
						error: null
					})
				})
			})
		});

		(mockSupabase.from as ReturnType<typeof vi.fn>) = mockFrom;

		const result = await fetchNotifications(mockSupabase);

		expect(result).toEqual([]);
	});

	it('throws error when database query fails', async () => {
		const mockFrom = vi.fn().mockReturnValue({
			select: vi.fn().mockReturnValue({
				order: vi.fn().mockReturnValue({
					range: vi.fn().mockResolvedValue({
						data: null,
						error: { message: 'Database error' }
					})
				})
			})
		});

		(mockSupabase.from as ReturnType<typeof vi.fn>) = mockFrom;

		await expect(fetchNotifications(mockSupabase)).rejects.toThrow('Failed to fetch notifications');
	});
});

describe('getUnreadNotificationCount', () => {
	let mockSupabase: SupabaseClient;

	beforeEach(() => {
		mockSupabase = createMockSupabaseClient();
		vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	it('returns unread count from RPC', async () => {
		const mockRpc = vi.fn().mockResolvedValue({
			data: 5,
			error: null
		});

		(mockSupabase.rpc as ReturnType<typeof vi.fn>) = mockRpc;

		const result = await getUnreadNotificationCount(mockSupabase);

		expect(mockRpc).toHaveBeenCalledWith('get_unread_notification_count');
		expect(result).toBe(5);
	});

	it('returns 0 when no unread notifications', async () => {
		const mockRpc = vi.fn().mockResolvedValue({
			data: 0,
			error: null
		});

		(mockSupabase.rpc as ReturnType<typeof vi.fn>) = mockRpc;

		const result = await getUnreadNotificationCount(mockSupabase);

		expect(result).toBe(0);
	});

	it('throws error when RPC fails', async () => {
		const mockRpc = vi.fn().mockResolvedValue({
			data: null,
			error: { message: 'RPC error' }
		});

		(mockSupabase.rpc as ReturnType<typeof vi.fn>) = mockRpc;

		await expect(getUnreadNotificationCount(mockSupabase)).rejects.toThrow(
			'Failed to get unread notification count'
		);
	});
});

describe('markNotificationRead', () => {
	let mockSupabase: SupabaseClient;

	beforeEach(() => {
		mockSupabase = createMockSupabaseClient();
		vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	it('marks notification as read successfully', async () => {
		const mockRpc = vi.fn().mockResolvedValue({
			error: null
		});

		(mockSupabase.rpc as ReturnType<typeof vi.fn>) = mockRpc;

		await markNotificationRead(mockSupabase, 'notif-123');

		expect(mockRpc).toHaveBeenCalledWith('mark_notification_read', {
			p_notification_id: 'notif-123'
		});
	});

	it('throws error when RPC fails', async () => {
		const mockRpc = vi.fn().mockResolvedValue({
			error: { message: 'RPC error' }
		});

		(mockSupabase.rpc as ReturnType<typeof vi.fn>) = mockRpc;

		await expect(markNotificationRead(mockSupabase, 'notif-123')).rejects.toThrow(
			'Failed to mark notification as read'
		);
	});
});

describe('markAllNotificationsRead', () => {
	let mockSupabase: SupabaseClient;

	beforeEach(() => {
		mockSupabase = createMockSupabaseClient();
		vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	it('marks all notifications as read successfully', async () => {
		const mockRpc = vi.fn().mockResolvedValue({
			error: null
		});

		(mockSupabase.rpc as ReturnType<typeof vi.fn>) = mockRpc;

		await markAllNotificationsRead(mockSupabase);

		expect(mockRpc).toHaveBeenCalledWith('mark_all_notifications_read');
	});

	it('throws error when RPC fails', async () => {
		const mockRpc = vi.fn().mockResolvedValue({
			error: { message: 'RPC error' }
		});

		(mockSupabase.rpc as ReturnType<typeof vi.fn>) = mockRpc;

		await expect(markAllNotificationsRead(mockSupabase)).rejects.toThrow(
			'Failed to mark all notifications as read'
		);
	});
});
