<script lang="ts">
	import { auth } from '$lib/stores/auth';
	import BaseLayout from '$lib/components/BaseLayout.svelte';
	import HappeningNow from '$lib/components/HappeningNow.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<BaseLayout>
	<div class="container mx-auto p-4">
		<h1 class="text-2xl font-bold mb-4">Dashboard</h1>

		{#if $auth.user}
			<p class="mb-6">Welcome, {$auth.user.email}!</p>

			<!-- Happening Now Section -->
			<HappeningNow events={data.happeningNowEvents} />
		{:else}
			<p>Loading...</p>
		{/if}
	</div>
</BaseLayout>
