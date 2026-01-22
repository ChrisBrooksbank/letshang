import type { LayoutServerLoad } from './$types';

/**
 * Root layout server load function.
 * Makes the session and user available to all pages via $page.data
 */
export const load: LayoutServerLoad = async ({ locals }) => {
	return {
		session: locals.session,
		user: locals.user
	};
};
