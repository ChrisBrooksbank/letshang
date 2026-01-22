import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

/**
 * Logout page load function.
 * Redirects logged out users to login page.
 */
export const load: PageServerLoad = async ({ locals }) => {
	// If not logged in, redirect to login
	if (!locals.session) {
		throw redirect(303, '/login');
	}

	return {};
};

/**
 * Logout action.
 * Signs out the user and clears all session tokens and cookies.
 */
export const actions: Actions = {
	default: async ({ locals, cookies }) => {
		// Sign out from Supabase (invalidates refresh token)
		await locals.supabase.auth.signOut();

		// Clear all auth-related cookies
		// Supabase SSR uses these cookie names
		const authCookies = [
			'sb-access-token',
			'sb-refresh-token',
			'sb-auth-token',
			// Also clear any cookies with the project ref pattern
			...cookies
				.getAll()
				.filter((cookie) => cookie.name.startsWith('sb-'))
				.map((cookie) => cookie.name)
		];

		authCookies.forEach((cookieName) => {
			cookies.delete(cookieName, { path: '/' });
		});

		// Redirect to login page
		throw redirect(303, '/login');
	}
};
