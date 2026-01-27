<script lang="ts">
	import { auth } from '$lib/stores/auth';
	import BaseLayout from '$lib/components/BaseLayout.svelte';
	import HappeningNow from '$lib/components/HappeningNow.svelte';
	import HappeningToday from '$lib/components/HappeningToday.svelte';
	import EventCard from '$lib/components/EventCard.svelte';
	import { formatDistance } from '$lib/utils/location';
	import type { PageData } from './$types';
	import type { SearchEventResult } from '$lib/server/search';

	let { data }: { data: PageData } = $props();
</script>

<BaseLayout unreadNotificationCount={data.unreadNotificationCount ?? 0}>
	<div class="container mx-auto p-4">
		<h1 class="text-2xl font-bold mb-4">Dashboard</h1>

		{#if $auth.user}
			<p class="mb-6">Welcome, {$auth.user.email}!</p>

			<!-- Nearby Events Section -->
			{#if data.nearbyEvents && data.nearbyEvents.length > 0}
				<section class="mb-8">
					<h2 class="text-xl font-semibold mb-4 text-gray-900">Near You</h2>
					<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
						{#each data.nearbyEvents as event (event.id)}
							<div class="relative">
								<EventCard event={event as unknown as SearchEventResult} />
								<div
									class="absolute top-2 right-2 bg-blue-600 text-white px-2 py-1 rounded-full text-xs font-medium"
								>
									{formatDistance(event.distance_miles)}
								</div>
							</div>
						{/each}
					</div>
				</section>
			{/if}

			<!-- Happening Now Section -->
			<HappeningNow events={data.happeningNowEvents} />

			<!-- Happening Today Section -->
			<HappeningToday events={data.happeningTodayEvents} />
		{:else}
			<p>Loading...</p>
		{/if}
	</div>
</BaseLayout>
