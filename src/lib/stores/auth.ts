import { writable } from 'svelte/store';
import type { User, Session, SupabaseClient } from '@supabase/supabase-js';

/**
 * Auth store interface
 */
interface AuthStore {
	user: User | null;
	session: Session | null;
	loading: boolean;
}

/**
 * Initial auth store state
 */
const initialState: AuthStore = {
	user: null,
	session: null,
	loading: true
};

/**
 * Minimum time in seconds before token expiry to trigger refresh.
 * Tokens expire in 15 minutes (900s), we refresh at 13 minutes (780s) to provide buffer.
 */
const REFRESH_BUFFER_SECONDS = 120; // 2 minutes before expiry

/**
 * Client-side auth store.
 *
 * This store maintains the current authentication state and provides
 * reactive access to user and session data throughout the app.
 * It also handles automatic token refresh before expiry.
 *
 * Usage:
 * ```svelte
 * <script>
 *   import { auth } from '$lib/stores/auth';
 * </script>
 *
 * {#if $auth.loading}
 *   Loading...
 * {:else if $auth.user}
 *   Welcome, {$auth.user.email}
 * {:else}
 *   Please log in
 * {/if}
 * ```
 */
function createAuthStore() {
	const { subscribe, set, update } = writable<AuthStore>(initialState);

	let refreshTimer: ReturnType<typeof setTimeout> | null = null;
	let supabaseClient: SupabaseClient | null = null;

	/**
	 * Schedule token refresh before expiry
	 */
	function scheduleRefresh(session: Session) {
		// Clear existing timer
		if (refreshTimer) {
			clearTimeout(refreshTimer);
			refreshTimer = null;
		}

		// Calculate time until refresh needed
		const expiresAt = session.expires_at; // Unix timestamp in seconds
		if (!expiresAt) return;

		const now = Math.floor(Date.now() / 1000); // Current time in seconds
		const expiresIn = expiresAt - now; // Seconds until expiry
		const refreshIn = Math.max(0, expiresIn - REFRESH_BUFFER_SECONDS); // Seconds until refresh

		// Only schedule if there's time left
		if (refreshIn > 0) {
			refreshTimer = setTimeout(() => {
				refreshSession();
			}, refreshIn * 1000); // Convert to milliseconds
		}
	}

	/**
	 * Refresh the session token
	 */
	async function refreshSession() {
		if (!supabaseClient) return;

		const { data, error } = await supabaseClient.auth.refreshSession();

		if (error) {
			// Clear auth on refresh failure
			// In production, this should be logged to a monitoring service
			set({ user: null, session: null, loading: false });
			return;
		}

		if (data.session && data.user) {
			set({ user: data.user, session: data.session, loading: false });
			scheduleRefresh(data.session);
		}
	}

	return {
		subscribe,
		/**
		 * Initialize the auth store with a Supabase client.
		 * This should be called once during app initialization.
		 */
		initialize: (client: SupabaseClient) => {
			supabaseClient = client;

			// Set up auth state change listener
			client.auth.onAuthStateChange((_event, session) => {
				if (session && session.user) {
					set({ user: session.user, session, loading: false });
					scheduleRefresh(session);
				} else {
					set({ user: null, session: null, loading: false });
					if (refreshTimer) {
						clearTimeout(refreshTimer);
						refreshTimer = null;
					}
				}
			});
		},
		/**
		 * Set the current user and session
		 */
		setAuth: (user: User | null, session: Session | null) => {
			set({ user, session, loading: false });
			if (session) {
				scheduleRefresh(session);
			}
		},
		/**
		 * Clear auth state (logout)
		 */
		clearAuth: () => {
			if (refreshTimer) {
				clearTimeout(refreshTimer);
				refreshTimer = null;
			}
			set({ user: null, session: null, loading: false });
		},
		/**
		 * Set loading state
		 */
		setLoading: (loading: boolean) => {
			update((state) => ({ ...state, loading }));
		},
		/**
		 * Reset to initial state
		 */
		reset: () => {
			if (refreshTimer) {
				clearTimeout(refreshTimer);
				refreshTimer = null;
			}
			set(initialState);
		},
		/**
		 * Manually trigger a session refresh
		 */
		refresh: () => {
			refreshSession();
		}
	};
}

export const auth = createAuthStore();
