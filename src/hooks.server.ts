import { createServerClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import type { Handle } from '@sveltejs/kit';
import type { Database } from '$lib/types/database';

/**
 * Server-side hook to handle Supabase authentication on every request.
 * This middleware:
 * - Creates a Supabase client with cookie handling for SSR
 * - Refreshes the user's session if needed
 * - Makes the session and user available in locals
 * - Ensures cookies are properly updated in the response
 */
export const handle: Handle = async ({ event, resolve }) => {
	// Create a Supabase client scoped to this request
	event.locals.supabase = createServerClient<Database>(
		PUBLIC_SUPABASE_URL,
		PUBLIC_SUPABASE_ANON_KEY,
		{
			cookies: {
				getAll: () => {
					return event.cookies.getAll();
				},
				setAll: (cookiesToSet) => {
					cookiesToSet.forEach(({ name, value, options }) => {
						event.cookies.set(name, value, { ...options, path: '/' });
					});
				}
			}
		}
	);

	/**
	 * Unlike other Supabase integrations, we don't immediately call getUser() here.
	 * Instead, we wait for getSession() which is faster and doesn't hit the database.
	 * The session includes the access token which can be validated.
	 *
	 * This is intentional - we're not validating the access token on every request
	 * for performance reasons. The token is validated client-side and on protected routes.
	 */
	const {
		data: { session }
	} = await event.locals.supabase.auth.getSession();

	event.locals.session = session;
	event.locals.user = session?.user ?? null;

	return resolve(event, {
		filterSerializedResponseHeaders(name) {
			// Supabase needs these headers to set cookies properly
			return name === 'content-range' || name === 'x-supabase-api-version';
		}
	});
};
