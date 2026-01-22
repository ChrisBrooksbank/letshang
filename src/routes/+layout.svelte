<script lang="ts">
	import { onMount } from 'svelte';
	import { invalidate } from '$app/navigation';
	import { auth } from '$lib/stores/auth';
	import { createBrowserClient } from '@supabase/ssr';
	import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';

	let { data, children } = $props();

	/**
	 * Create a browser-side Supabase client for auth state management.
	 * This client is separate from the server-side client and handles
	 * client-side auth operations and token refresh.
	 */
	const supabase = createBrowserClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
		global: {
			headers: {}
		}
	});

	/**
	 * Initialize the auth store with the Supabase client.
	 * This sets up automatic token refresh and auth state change listeners.
	 */
	onMount(() => {
		auth.initialize(supabase);

		// Set initial auth state from server data
		if (data.session && data.user) {
			auth.setAuth(data.user, data.session);
		}

		// Listen for auth state changes and invalidate the layout when they occur.
		// This ensures the UI updates when users log in/out.
		const {
			data: { subscription }
		} = supabase.auth.onAuthStateChange((_event, _session) => {
			invalidate('supabase:auth');
		});

		return () => {
			subscription.unsubscribe();
		};
	});

	/**
	 * Sync the auth store with the session data from the server.
	 * This reactive statement runs whenever data.session or data.user changes.
	 */
	$effect(() => {
		if (data.session && data.user) {
			auth.setAuth(data.user, data.session);
		} else {
			auth.clearAuth();
		}
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
