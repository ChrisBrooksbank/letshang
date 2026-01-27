<script lang="ts">
	import EventCard from './EventCard.svelte';
	import { canJoinLate, minutesUntilEnd } from '$lib/utils/happening-now';
	import type { SearchEventResult } from '$lib/server/search';

	interface Props {
		events: SearchEventResult[];
	}

	let { events }: Props = $props();

	// Get events that can be joined late (at least 15 min remaining)
	const joinableEvents = $derived(
		events.filter((event) => canJoinLate(event.start_time, event.end_time))
	);

	// Format minutes remaining for display
	function formatTimeRemaining(endTime: string | null): string {
		const minutes = minutesUntilEnd(endTime);

		if (minutes < 60) {
			return `${minutes} min left`;
		}

		const hours = Math.floor(minutes / 60);
		const remainingMinutes = minutes % 60;

		if (remainingMinutes === 0) {
			return `${hours}h left`;
		}

		return `${hours}h ${remainingMinutes}m left`;
	}
</script>

{#if joinableEvents.length > 0}
	<section class="mb-8" aria-labelledby="happening-now-heading">
		<!-- Section Header -->
		<div class="flex items-center justify-between mb-4">
			<div class="flex items-center gap-2">
				<div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
				<h2 id="happening-now-heading" class="text-2xl font-bold text-gray-900">Happening Now</h2>
			</div>
			<span class="text-sm text-gray-600"
				>{joinableEvents.length} event{joinableEvents.length === 1 ? '' : 's'}</span
			>
		</div>

		<!-- Events Grid -->
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
			{#each joinableEvents as event (event.id)}
				<div class="relative">
					<EventCard {event} />

					<!-- Join Late Badge -->
					<div
						class="absolute top-2 right-2 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-medium shadow-lg flex items-center gap-1"
					>
						<svg
							class="w-3 h-3"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							aria-hidden="true"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
						<span>{formatTimeRemaining(event.end_time)}</span>
					</div>

					<!-- Join Late Affordance -->
					<div class="mt-2 bg-green-50 border border-green-200 rounded-lg p-3">
						<p class="text-sm text-green-800 font-medium flex items-center gap-2">
							<svg
								class="w-4 h-4 flex-shrink-0"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
								aria-hidden="true"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M13 10V3L4 14h7v7l9-11h-7z"
								/>
							</svg>
							<span>Join now - event in progress!</span>
						</p>
					</div>
				</div>
			{/each}
		</div>
	</section>
{/if}
