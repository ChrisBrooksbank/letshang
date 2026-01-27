import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { getUnreadNotificationCount } from '$lib/server/notifications';

/**
 * Protected route layout.
 * All routes under (app) require authentication.
 * Unauthenticated users are redirected to the login page.
 */
export const load: LayoutServerLoad = async ({ locals, url }) => {
	if (!locals.session) {
		// Preserve the intended destination for post-login redirect
		const redirectTo = url.pathname + url.search;
		throw redirect(303, `/login?redirectTo=${encodeURIComponent(redirectTo)}`);
	}

	// Fetch unread notification count for navigation badge
	let unreadNotificationCount = 0;
	try {
		unreadNotificationCount = await getUnreadNotificationCount(locals.supabase);
	} catch (error) {
		console.error('Error fetching unread notification count:', error);
		// Don't fail the page load if notification count fails
	}

	return {
		session: locals.session,
		user: locals.user,
		unreadNotificationCount
	};
};
