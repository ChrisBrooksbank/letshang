<script lang="ts">
	import EventCard from './EventCard.svelte';
	import { formatTimeUntilStart, isStartingSoon } from '$lib/utils/happening-today';
	import type { HappeningTodayEvent } from '$lib/server/happening-today';

	interface Props {
		events: HappeningTodayEvent[];
	}

	let { events }: Props = $props();

	// State for carousel scroll
	let scrollContainer: HTMLDivElement | undefined = $state();
	let showLeftArrow = $state(false);
	let showRightArrow = $state(false);

	// Check scroll position to show/hide arrows
	function updateArrows() {
		if (!scrollContainer) return;

		const { scrollLeft, scrollWidth, clientWidth } = scrollContainer;
		showLeftArrow = scrollLeft > 0;
		showRightArrow = scrollLeft < scrollWidth - clientWidth - 10;
	}

	// Scroll carousel left or right
	function scroll(direction: 'left' | 'right') {
		if (!scrollContainer) return;

		const scrollAmount = scrollContainer.clientWidth * 0.8;
		const newScrollLeft =
			direction === 'left'
				? scrollContainer.scrollLeft - scrollAmount
				: scrollContainer.scrollLeft + scrollAmount;

		scrollContainer.scrollTo({
			left: newScrollLeft,
			behavior: 'smooth'
		});
	}
</script>

{#if events.length > 0}
	<section class="mb-8" aria-labelledby="happening-today-heading">
		<!-- Section Header -->
		<div class="flex items-center justify-between mb-4">
			<div class="flex items-center gap-2">
				<div class="w-2 h-2 bg-blue-500 rounded-full"></div>
				<h2 id="happening-today-heading" class="text-2xl font-bold text-gray-900">
					Happening Today
				</h2>
			</div>
			<span class="text-sm text-gray-600"
				>{events.length} event{events.length === 1 ? '' : 's'}</span
			>
		</div>

		<!-- Carousel Container -->
		<div class="relative">
			<!-- Left Arrow -->
			{#if showLeftArrow}
				<button
					class="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full shadow-lg p-2 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
					onclick={() => scroll('left')}
					aria-label="Scroll left"
				>
					<svg class="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M15 19l-7-7 7-7"
						/>
					</svg>
				</button>
			{/if}

			<!-- Right Arrow -->
			{#if showRightArrow}
				<button
					class="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full shadow-lg p-2 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
					onclick={() => scroll('right')}
					aria-label="Scroll right"
				>
					<svg class="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 5l7 7-7 7"
						/>
					</svg>
				</button>
			{/if}

			<!-- Scrollable Cards Container -->
			<div
				bind:this={scrollContainer}
				onscroll={updateArrows}
				class="flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory hide-scrollbar pb-2"
				style="scroll-padding-left: 1rem; scroll-padding-right: 1rem;"
			>
				{#each events as event (event.id)}
					<div class="flex-none w-[85%] sm:w-[45%] md:w-[30%] snap-start">
						<div class="relative">
							<EventCard {event} />

							<!-- Time Until Start Badge -->
							<div
								class="absolute top-2 right-2 bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-medium shadow-lg flex items-center gap-1"
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
								<span>{formatTimeUntilStart(event.start_time)}</span>
							</div>

							<!-- Starting Soon Indicator -->
							{#if isStartingSoon(event.start_time)}
								<div class="mt-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
									<p class="text-sm text-amber-800 font-medium flex items-center gap-2">
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
												d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
											/>
										</svg>
										<span>Starting soon!</span>
									</p>
								</div>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		</div>

		<!-- Swipe Hint (Mobile Only) -->
		<p class="text-xs text-gray-500 text-center mt-2 sm:hidden">Swipe to see more events</p>
	</section>
{/if}

<style>
	/* Hide scrollbar while keeping scroll functionality */
	.hide-scrollbar {
		-ms-overflow-style: none; /* IE and Edge */
		scrollbar-width: none; /* Firefox */
	}

	.hide-scrollbar::-webkit-scrollbar {
		display: none; /* Chrome, Safari, Opera */
	}
</style>
