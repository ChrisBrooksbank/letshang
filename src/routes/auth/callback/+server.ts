import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * Auth callback handler for email verification and OAuth flows
 * Supabase redirects here after email verification or social login
 */
export const GET: RequestHandler = async ({ url, locals }) => {
	// Get the code from the URL query params
	const code = url.searchParams.get('code');

	// Get the next URL to redirect to after authentication
	// Default to dashboard if not specified
	const next = url.searchParams.get('next') ?? '/dashboard';

	// If there's a code, exchange it for a session
	if (code) {
		const { error } = await locals.supabase.auth.exchangeCodeForSession(code);

		// If there was an error, redirect to an error page
		if (error) {
			// Redirect to login with error message
			throw redirect(
				303,
				`/login?error=${encodeURIComponent('Verification failed. Please try again.')}`
			);
		}
	}

	// Redirect to the next URL (or dashboard)
	throw redirect(303, next);
};
