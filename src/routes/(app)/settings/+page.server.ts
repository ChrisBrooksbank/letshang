import { redirect, fail, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import {
	fetchUserNotificationPreferences,
	updateNotificationPreference
} from '$lib/server/notifications';
import { notificationPreferenceSchema } from '$lib/schemas/notifications';

export const load: PageServerLoad = async ({ locals }) => {
	// Ensure user is authenticated
	const session = await locals.supabase.auth.getSession();
	if (!session.data.session) {
		redirect(303, '/login');
	}

	const supabase = locals.supabase;

	try {
		const preferences = await fetchUserNotificationPreferences(supabase);

		return {
			preferences
		};
	} catch {
		// If fetch fails, return empty array
		return {
			preferences: []
		};
	}
};

export const actions: Actions = {
	/**
	 * Update a single notification preference
	 */
	updatePreference: async ({ locals, request }) => {
		// Ensure user is authenticated
		const session = await locals.supabase.auth.getSession();
		if (!session.data.session) {
			return fail(401, { error: 'Unauthorized' });
		}

		const supabase = locals.supabase;
		const formData = await request.formData();

		// Parse form data
		const notificationType = formData.get('notificationType') as string;
		const pushEnabled = formData.get('pushEnabled') === 'true';
		const emailEnabled = formData.get('emailEnabled') === 'true';
		const inAppEnabled = formData.get('inAppEnabled') === 'true';

		// Validate
		const result = notificationPreferenceSchema.safeParse({
			notificationType,
			pushEnabled,
			emailEnabled,
			inAppEnabled
		});

		if (!result.success) {
			return fail(400, {
				error: 'Invalid notification preference data',
				errors: result.error.flatten().fieldErrors
			});
		}

		try {
			await updateNotificationPreference(
				supabase,
				result.data.notificationType,
				result.data.pushEnabled,
				result.data.emailEnabled,
				result.data.inAppEnabled
			);

			return {
				success: true
			};
		} catch {
			return fail(500, { error: 'Failed to update notification preference' });
		}
	}
};
