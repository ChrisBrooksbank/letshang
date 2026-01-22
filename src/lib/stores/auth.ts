import { writable } from 'svelte/store';
import type { User, Session } from '@supabase/supabase-js';

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
 * Client-side auth store.
 *
 * This store maintains the current authentication state and provides
 * reactive access to user and session data throughout the app.
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

	return {
		subscribe,
		/**
		 * Set the current user and session
		 */
		setAuth: (user: User | null, session: Session | null) => {
			set({ user, session, loading: false });
		},
		/**
		 * Clear auth state (logout)
		 */
		clearAuth: () => {
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
			set(initialState);
		}
	};
}

export const auth = createAuthStore();
