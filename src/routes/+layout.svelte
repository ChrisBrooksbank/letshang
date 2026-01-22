<script lang="ts">
	import { onMount } from 'svelte';
	import { invalidate } from '$app/navigation';
	import { auth } from '$lib/stores/auth';
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';

	let { data, children } = $props();

	/**
	 * Sync the auth store with the session data from the server.
	 * This reactive statement runs whenever data.session or data.user changes.
	 */
	$effect(() => {
		auth.setAuth(data.user ?? null, data.session ?? null);
	});

	/**
	 * Listen for auth state changes and invalidate the layout when they occur.
	 * This ensures the UI updates when users log in/out.
	 */
	onMount(() => {
		const { data: authListener } = data.supabase.auth.onAuthStateChange(() => {
			invalidate('supabase:auth');
		});

		return () => {
			authListener.subscription.unsubscribe();
		};
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
