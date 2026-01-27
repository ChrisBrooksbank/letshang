import { describe, it, expect, vi, beforeEach } from 'vitest';
import { load, actions } from './+page.server';
import type { SupabaseClient } from '@supabase/supabase-js';

// Mock the notifications module
vi.mock('$lib/server/notifications', () => ({
	fetchNotifications: vi.fn(),
	markNotificationRead: vi.fn(),
	markAllNotificationsRead: vi.fn()
}));

import {
	fetchNotifications,
	markNotificationRead,
	markAllNotificationsRead
} from '$lib/server/notifications';

describe('Notifications Page Server', () => {
	let mockSupabase: SupabaseClient;

	beforeEach(() => {
		mockSupabase = {} as SupabaseClient;
		vi.clearAllMocks();
	});

	describe('load function', () => {
		it('should load notifications successfully', async () => {
			const mockNotifications = [
				{
					id: 'notif-1',
					userId: 'user-123',
					notificationType: 'event_reminder',
					title: 'Event starting soon',
					message: 'Your event starts in 1 hour',
					link: '/events/123',
					isRead: false,
					createdAt: '2026-01-27T10:00:00Z',
					readAt: null
				}
			];

			(fetchNotifications as ReturnType<typeof vi.fn>).mockResolvedValue(mockNotifications);

			const locals = { supabase: mockSupabase };
			const result = await load({ locals } as never);

			expect(result).toEqual({ notifications: mockNotifications });
			expect(fetchNotifications).toHaveBeenCalledWith(mockSupabase);
		});

		it('should return empty array on fetch error', async () => {
			(fetchNotifications as ReturnType<typeof vi.fn>).mockRejectedValue(
				new Error('Database error')
			);

			const locals = { supabase: mockSupabase };
			const result = await load({ locals } as never);

			expect(result).toEqual({ notifications: [] });
		});
	});

	describe('actions.markRead', () => {
		it('should mark notification as read successfully', async () => {
			const formData = new FormData();
			formData.append('notificationId', 'notif-123');

			(markNotificationRead as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

			const request = { formData: async () => formData } as never;
			const locals = { supabase: mockSupabase };

			const result = await actions.markRead({ request, locals } as never);

			expect(result).toEqual({ success: true });
			expect(markNotificationRead).toHaveBeenCalledWith(mockSupabase, 'notif-123');
		});

		it('should return error if notificationId is missing', async () => {
			const formData = new FormData();

			const request = { formData: async () => formData } as never;
			const locals = { supabase: mockSupabase };

			const result = await actions.markRead({ request, locals } as never);

			expect(result).toEqual({ success: false, error: 'Invalid notification ID' });
			expect(markNotificationRead).not.toHaveBeenCalled();
		});

		it('should return error on database failure', async () => {
			const formData = new FormData();
			formData.append('notificationId', 'notif-123');

			(markNotificationRead as ReturnType<typeof vi.fn>).mockRejectedValue(
				new Error('Database error')
			);

			const request = { formData: async () => formData } as never;
			const locals = { supabase: mockSupabase };

			const result = await actions.markRead({ request, locals } as never);

			expect(result).toEqual({ success: false, error: 'Failed to mark notification as read' });
		});
	});

	describe('actions.markAllRead', () => {
		it('should mark all notifications as read successfully', async () => {
			(markAllNotificationsRead as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

			const locals = { supabase: mockSupabase };
			const result = await actions.markAllRead({ locals } as never);

			expect(result).toEqual({ success: true });
			expect(markAllNotificationsRead).toHaveBeenCalledWith(mockSupabase);
		});

		it('should return error on database failure', async () => {
			(markAllNotificationsRead as ReturnType<typeof vi.fn>).mockRejectedValue(
				new Error('Database error')
			);

			const locals = { supabase: mockSupabase };
			const result = await actions.markAllRead({ locals } as never);

			expect(result).toEqual({
				success: false,
				error: 'Failed to mark all notifications as read'
			});
		});
	});
});
