<script lang="ts">
	import { auth } from '$lib/stores/auth';
</script>

<div class="container mx-auto p-4">
	<h1 class="text-2xl font-bold mb-4">Dashboard</h1>

	{#if $auth.user}
		<p>Welcome, {$auth.user.email}!</p>
		<p class="text-sm text-gray-600 mt-2">User ID: {$auth.user.id}</p>
	{:else}
		<p>Loading...</p>
	{/if}
</div>
