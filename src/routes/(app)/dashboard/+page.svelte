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

			<!-- Empty State - Show when no events -->
			{#if (!data.nearbyEvents || data.nearbyEvents.length === 0) && (!data.happeningNowEvents || data.happeningNowEvents.length === 0) && (!data.happeningTodayEvents || data.happeningTodayEvents.length === 0)}
				<div class="mt-8 space-y-6">
					<!-- Getting Started Card -->
					<div class="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-6 text-white">
						<h2 class="text-xl font-bold mb-2">Get Started with LetsHang</h2>
						<p class="opacity-90 mb-4">
							Connect with people in your community through events and groups.
						</p>
					</div>

					<!-- Quick Actions -->
					<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<a
							href="/events/create"
							class="block p-6 bg-white border-2 border-green-200 rounded-xl hover:border-green-400 hover:shadow-lg transition"
						>
							<div class="text-3xl mb-2">📅</div>
							<h3 class="font-bold text-gray-900 mb-1">Create an Event</h3>
							<p class="text-sm text-gray-600">Host a meetup, workshop, or hangout</p>
						</a>

						<a
							href="/groups/create"
							class="block p-6 bg-white border-2 border-blue-200 rounded-xl hover:border-blue-400 hover:shadow-lg transition"
						>
							<div class="text-3xl mb-2">👥</div>
							<h3 class="font-bold text-gray-900 mb-1">Start a Group</h3>
							<p class="text-sm text-gray-600">Build a community around shared interests</p>
						</a>

						<a
							href="/categories"
							class="block p-6 bg-white border-2 border-purple-200 rounded-xl hover:border-purple-400 hover:shadow-lg transition"
						>
							<div class="text-3xl mb-2">🔍</div>
							<h3 class="font-bold text-gray-900 mb-1">Browse Categories</h3>
							<p class="text-sm text-gray-600">Find groups by topic: Tech, Sports, Arts...</p>
						</a>

						<a
							href="/profile/edit"
							class="block p-6 bg-white border-2 border-orange-200 rounded-xl hover:border-orange-400 hover:shadow-lg transition"
						>
							<div class="text-3xl mb-2">📍</div>
							<h3 class="font-bold text-gray-900 mb-1">Set Your Location</h3>
							<p class="text-sm text-gray-600">Get personalized event recommendations</p>
						</a>
					</div>
				</div>
			{/if}
		{:else}
			<p>Loading...</p>
		{/if}
	</div>
</BaseLayout>
