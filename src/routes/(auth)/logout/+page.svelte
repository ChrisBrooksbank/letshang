<script lang="ts">
	import { onMount } from 'svelte';
	import { enhance } from '$app/forms';

	let isLoggingOut = $state(false);
	// eslint-disable-next-line no-undef
	let formElement = $state<HTMLFormElement>();

	// Auto-submit on mount
	onMount(() => {
		if (formElement) {
			formElement.requestSubmit();
		}
	});
</script>

<svelte:head>
	<title>Logging out - LetsHang</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center bg-gray-50 px-4">
	<div class="max-w-md w-full text-center">
		<h1 class="text-2xl font-bold text-gray-900 mb-4">Logging out...</h1>
		<p class="text-gray-600 mb-8">Please wait while we sign you out.</p>

		<form
			method="POST"
			bind:this={formElement}
			use:enhance={() => {
				isLoggingOut = true;
				return async ({ update }) => {
					await update();
					isLoggingOut = false;
				};
			}}
		>
			<button
				type="submit"
				disabled={isLoggingOut}
				class="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
			>
				{isLoggingOut ? 'Logging out...' : 'Log out'}
			</button>
		</form>

		<noscript>
			<p class="mt-4 text-sm text-gray-500">
				JavaScript is required for automatic logout. Please click the button above.
			</p>
		</noscript>
	</div>
</div>
