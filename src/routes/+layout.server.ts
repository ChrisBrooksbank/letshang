import type { LayoutServerLoad } from './$types';

/**
 * Root layout server load function.
 * Makes the session available to all pages via $page.data.session
 */
export const load: LayoutServerLoad = async ({ locals }) => {
	return {
		session: locals.session
	};
};
