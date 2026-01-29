import { redirect } from '@sveltejs/kit';
import { createServerClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import type { RequestHandler } from './$types';
import type { Database } from '$lib/types/database';

/**
 * Auth callback handler for email verification and OAuth flows
 * Supabase redirects here after email verification or social login
 *
 * IMPORTANT: We create a fresh Supabase client here instead of using locals.supabase
 * to ensure cookies are set synchronously before the redirect response is sent.
 * The hooks.server.ts client can have timing issues with async cookie setting.
 */
export const GET: RequestHandler = async ({ url, cookies }) => {
	// Get the code from the URL query params
	const code = url.searchParams.get('code');

	// Get the next URL to redirect to after authentication
	// Default to dashboard if not specified
	const next = url.searchParams.get('next') ?? '/dashboard';

	// If there's a code, exchange it for a session
	if (code) {
		// Create a Supabase client specifically for this request
		// This ensures cookies are set directly via the cookies object
		const supabase = createServerClient<Database>(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
			cookies: {
				getAll: () => cookies.getAll(),
				setAll: (cookiesToSet) => {
					console.log(
						'[Auth Callback] Setting cookies:',
						cookiesToSet.map((c) => c.name)
					);
					cookiesToSet.forEach(({ name, value, options }) => {
						cookies.set(name, value, { ...options, path: '/' });
					});
				}
			}
		});

		const { data, error } = await supabase.auth.exchangeCodeForSession(code);

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
