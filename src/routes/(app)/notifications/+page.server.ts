import type { PageServerLoad, Actions } from './$types';
import {
	fetchNotifications,
	markNotificationRead,
	markAllNotificationsRead
} from '$lib/server/notifications';

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	// Auth is handled at (app) layout level
	try {
		const notifications = await fetchNotifications(supabase);

		return {
			notifications
		};
	} catch {
		return {
			notifications: []
		};
	}
};

export const actions: Actions = {
	markRead: async ({ request, locals: { supabase } }) => {
		const formData = await request.formData();
		const notificationId = formData.get('notificationId');

		if (typeof notificationId !== 'string') {
			return { success: false, error: 'Invalid notification ID' };
		}

		try {
			await markNotificationRead(supabase, notificationId);
			return { success: true };
		} catch {
			return { success: false, error: 'Failed to mark notification as read' };
		}
	},

	markAllRead: async ({ locals: { supabase } }) => {
		try {
			await markAllNotificationsRead(supabase);
			return { success: true };
		} catch {
			return { success: false, error: 'Failed to mark all notifications as read' };
		}
	}
};
