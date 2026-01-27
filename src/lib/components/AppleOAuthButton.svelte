<script lang="ts">
	import { goto } from '$app/navigation';
	import type { SupabaseClient } from '@supabase/supabase-js';
	import type { Database } from '$lib/types/database';

	export let supabase: SupabaseClient<Database>;
	export let mode: 'signin' | 'signup' = 'signin';

	let isLoading = false;

	async function handleAppleOAuth() {
		isLoading = true;
		try {
			const { error } = await supabase.auth.signInWithOAuth({
				provider: 'apple',
				options: {
					redirectTo: `${window.location.origin}/auth/callback`
				}
			});

			if (error) {
				throw error;
			}

			// OAuth redirect will happen automatically
		} catch (err) {
			isLoading = false;
			const message = err instanceof Error ? err.message : 'Failed to sign in with Apple';
			// Show error to user
			await goto(`/login?error=${encodeURIComponent(message)}`);
		}
	}
</script>

<button
	type="button"
	on:click={handleAppleOAuth}
	disabled={isLoading}
	class="w-full bg-black hover:bg-gray-900 text-white font-semibold py-3 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
	aria-label={mode === 'signin' ? 'Sign in with Apple' : 'Sign up with Apple'}
>
	<!-- Apple Logo SVG -->
	<svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
		<path
			d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"
		/>
	</svg>

	{#if isLoading}
		<span>Connecting...</span>
	{:else if mode === 'signin'}
		<span>Sign in with Apple</span>
	{:else}
		<span>Sign up with Apple</span>
	{/if}
</button>
