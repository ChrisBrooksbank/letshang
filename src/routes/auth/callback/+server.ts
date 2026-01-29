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
		const { data, error } = await locals.supabase.auth.exchangeCodeForSession(code);

		console.log('[Auth Callback] Exchange result:', {
			hasSession: !!data?.session,
			hasUser: !!data?.user,
			error: error?.message
		});

		// If there was an error, redirect to an error page
		if (error) {
			console.error('[Auth Callback] Error:', error.message);
			// Redirect to login with error message
			throw redirect(
				303,
				`/login?error=${encodeURIComponent(error.message || 'Verification failed. Please try again.')}`
			);
		}
	} else {
		console.log('[Auth Callback] No code in URL');
	}

	// Redirect to the next URL (or dashboard)
	throw redirect(303, next);
};
