import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

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

	return {
		session: locals.session,
		user: locals.user
	};
};
