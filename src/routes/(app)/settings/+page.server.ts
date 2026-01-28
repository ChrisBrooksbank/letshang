import { redirect, fail, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import {
	fetchUserNotificationPreferences,
	updateNotificationPreference
} from '$lib/server/notifications';
import { hasActivePushSubscription } from '$lib/server/push-subscriptions';
import { notificationPreferenceSchema } from '$lib/schemas/notifications';
import { getBlockedUsers, blockUser, unblockUser } from '$lib/server/blocks';
import { blockUserSchema, unblockUserSchema } from '$lib/schemas/blocks';
import {
	fetchMessagingPreference,
	updateMessagingPreference
} from '$lib/server/messaging-preferences';
import { updateMessagingPreferenceSchema } from '$lib/schemas/messaging-preferences';

export const load: PageServerLoad = async ({ locals }) => {
	// Ensure user is authenticated
	const session = await locals.supabase.auth.getSession();
	if (!session.data.session) {
		redirect(303, '/login');
	}

	const supabase = locals.supabase;

	let preferences: Awaited<ReturnType<typeof fetchUserNotificationPreferences>> = [];
	let hasPushSubscription = false;
	let blockedUsers: Awaited<ReturnType<typeof getBlockedUsers>> = [];
	let messagingPreference: Awaited<ReturnType<typeof fetchMessagingPreference>> = {
		allowDmFrom: 'anyone'
	};

	try {
		preferences = await fetchUserNotificationPreferences(supabase);
	} catch {
		// If fetch fails, return empty array
	}

	try {
		hasPushSubscription = await hasActivePushSubscription(supabase);
	} catch {
		// If check fails, assume no subscription
	}

	try {
		blockedUsers = await getBlockedUsers(supabase);
	} catch {
		// If fetch fails, return empty array
	}

	try {
		messagingPreference = await fetchMessagingPreference(supabase);
	} catch {
		// If fetch fails, return default preference
	}

	return {
		preferences,
		vapidPublicKey: process.env.PUBLIC_VAPID_PUBLIC_KEY ?? '',
		hasPushSubscription,
		blockedUsers,
		messagingPreference
	};
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
	},

	/**
	 * Block a user
	 */
	blockUser: async ({ locals, request }) => {
		const session = await locals.supabase.auth.getSession();
		if (!session.data.session) {
			return fail(401, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const blockedId = formData.get('blockedId') as string;
		const reason = formData.get('reason') as string | null;

		const result = blockUserSchema.safeParse({
			blockedId,
			reason: reason ?? undefined
		});

		if (!result.success) {
			return fail(400, {
				error: 'Invalid block data',
				errors: result.error.flatten().fieldErrors
			});
		}

		try {
			await blockUser(locals.supabase, result.data.blockedId, result.data.reason);
			return { success: true };
		} catch (e) {
			const message = e instanceof Error ? e.message : 'Failed to block user';
			return fail(500, { error: message });
		}
	},

	/**
	 * Update messaging preference (connection-gated DM settings)
	 */
	updateMessagingPreference: async ({ locals, request }) => {
		const session = await locals.supabase.auth.getSession();
		if (!session.data.session) {
			return fail(401, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const allowDmFrom = formData.get('allowDmFrom') as string;

		const result = updateMessagingPreferenceSchema.safeParse({ allowDmFrom });

		if (!result.success) {
			return fail(400, {
				error: 'Invalid messaging preference',
				errors: result.error.flatten().fieldErrors
			});
		}

		try {
			await updateMessagingPreference(locals.supabase, result.data.allowDmFrom);
			return { success: true };
		} catch {
			return fail(500, { error: 'Failed to update messaging preferences' });
		}
	},

	/**
	 * Unblock a user
	 */
	unblockUser: async ({ locals, request }) => {
		const session = await locals.supabase.auth.getSession();
		if (!session.data.session) {
			return fail(401, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const blockedId = formData.get('blockedId') as string;

		const result = unblockUserSchema.safeParse({ blockedId });

		if (!result.success) {
			return fail(400, {
				error: 'Invalid unblock data',
				errors: result.error.flatten().fieldErrors
			});
		}

		try {
			await unblockUser(locals.supabase, result.data.blockedId);
			return { success: true };
		} catch (e) {
			const message = e instanceof Error ? e.message : 'Failed to unblock user';
			return fail(500, { error: message });
		}
	}
};
