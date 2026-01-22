<script lang="ts">
	import { page } from '$app/stores';

	// Get the redirect URL from query params
	const redirectTo = $page.url.searchParams.get('redirectTo') ?? '/dashboard';
</script>

<div class="container mx-auto p-4">
	<h1 class="text-2xl font-bold mb-4">Login</h1>
	<p class="text-gray-600 mb-4">
		This is a placeholder login page. Full authentication will be implemented in a later iteration.
	</p>
	{#if redirectTo !== '/dashboard'}
		<p class="text-sm text-gray-500">You were trying to access: {redirectTo}</p>
	{/if}
</div>
