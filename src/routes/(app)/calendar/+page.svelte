<script lang="ts">
	import type { PageData } from './$types';
	import BaseLayout from '$lib/components/BaseLayout.svelte';
	import Calendar from '$lib/components/Calendar.svelte';
	import { goto } from '$app/navigation';
	import { getMonthBoundsISO, getWeekBoundsISO } from '$lib/utils/calendar';

	let { data }: { data: PageData } = $props();

	let view = $state<'month' | 'week'>('month');
	let selectedDate = $state(new Date());
	let selectedGroupId = $state<string | null>(null);

	// Initialize from data
	$effect(() => {
		view = data.view as 'month' | 'week';
		selectedGroupId = data.selectedGroupId;
	});

	// Update URL when filters change
	function updateURL() {
		const params = new URLSearchParams();

		if (view) {
			params.set('view', view);
		}

		if (selectedGroupId) {
			params.set('group', selectedGroupId);
		}

		// Add date bounds based on view
		const bounds = view === 'month'
			? getMonthBoundsISO(selectedDate.getFullYear(), selectedDate.getMonth())
			: getWeekBoundsISO(selectedDate);

		params.set('startDate', bounds.start);
		params.set('endDate', bounds.end);

		goto(`?${params.toString()}`, { replaceState: true, noScroll: true });
	}

	// Handle date change
	function handleDateChange(newDate: Date) {
		selectedDate = newDate;
		updateURL();
	}

	// Handle view change
	function handleViewChange(newView: 'month' | 'week') {
		view = newView;
		updateURL();
	}

	// Handle group filter change
	function handleGroupFilterChange(e: Event) {
		const target = e.target as HTMLSelectElement;
		selectedGroupId = target.value || null;
		updateURL();
	}
</script>

<BaseLayout>
	<div class="container mx-auto px-4 py-6 max-w-7xl">
		<!-- Page Header -->
		<div class="mb-6">
			<h1 class="text-3xl font-bold text-gray-900 mb-2">My Calendar</h1>
			<p class="text-gray-600">View all your upcoming events</p>
		</div>

		<!-- Filters -->
		<div class="mb-6 flex flex-wrap gap-4 items-center">
			<div class="flex items-center gap-2">
				<label for="groupFilter" class="text-sm font-medium text-gray-700">
					Filter by group:
				</label>
				<select
					id="groupFilter"
					value={selectedGroupId || ''}
					onchange={handleGroupFilterChange}
					class="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
				>
					<option value="">All groups</option>
					{#each data.groups as group}
						<option value={group.id}>{group.name}</option>
					{/each}
				</select>
			</div>

			<div class="flex items-center gap-2 text-sm text-gray-600">
				<div class="flex items-center gap-1">
					<div class="w-3 h-3 bg-green-100 border border-green-300 rounded"></div>
					<span>Going</span>
				</div>
				<div class="flex items-center gap-1">
					<div class="w-3 h-3 bg-blue-100 border border-blue-300 rounded"></div>
					<span>Interested</span>
				</div>
				<div class="flex items-center gap-1">
					<div class="w-3 h-3 bg-yellow-100 border border-yellow-300 rounded"></div>
					<span>Waitlisted</span>
				</div>
			</div>
		</div>

		<!-- Calendar Component -->
		<Calendar
			events={data.events}
			bind:view
			bind:selectedDate
			onDateChange={handleDateChange}
			onViewChange={handleViewChange}
		/>

		<!-- Empty State -->
		{#if data.events.length === 0}
			<div class="mt-8 text-center py-12">
				<div class="text-gray-400 text-5xl mb-4">📅</div>
				<h3 class="text-lg font-medium text-gray-900 mb-2">No events yet</h3>
				<p class="text-gray-600 mb-4">
					RSVP to events to see them on your calendar
				</p>
				<a
					href="/search"
					class="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
				>
					Find Events
				</a>
			</div>
		{/if}
	</div>
</BaseLayout>
