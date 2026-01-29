import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const session = await locals.supabase.auth.getSession();

	// If logged in, redirect to dashboard
	if (session.data.session) {
		throw redirect(303, '/dashboard');
	}

	// Otherwise show the landing page
	return {};
};
