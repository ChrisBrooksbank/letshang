import { createBrowserClient, createServerClient, isBrowser } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import type { LayoutLoad } from './$types';
import type { Database } from '$lib/types/database';

/**
 * Root layout load function.
 * Creates a Supabase client appropriate for the environment (browser or SSR).
 * This ensures auth state is properly synced across the app.
 */
export const load: LayoutLoad = async ({ data, depends, fetch }) => {
	/**
	 * Declare a dependency so the layout can be invalidated when needed.
	 * For example: invalidate('supabase:auth') will re-run this function.
	 */
	depends('supabase:auth');

	const supabase = isBrowser()
		? createBrowserClient<Database>(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
				global: {
					fetch
				}
			})
		: createServerClient<Database>(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
				global: {
					fetch
				},
				cookies: {
					getAll() {
						return data.session ? [] : [];
					},
					setAll() {
						// No-op on server - cookies are set via hooks.server.ts
					}
				}
			});

	/**
	 * Fetch the session on the client.
	 * This is safe to call on every navigation because Supabase caches it.
	 */
	const {
		data: { session }
	} = await supabase.auth.getSession();

	const { data: user } = await supabase.auth.getUser();

	return {
		supabase,
		session: session ?? data.session,
		user: user.user
	};
};
