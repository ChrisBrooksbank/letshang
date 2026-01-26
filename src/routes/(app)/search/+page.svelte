<script lang="ts">
	import type { PageData } from './$types';
	import BaseLayout from '$lib/components/BaseLayout.svelte';
	import EventCard from '$lib/components/EventCard.svelte';
	import GroupCard from '$lib/components/GroupCard.svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	let { data }: { data: PageData } = $props();

	// State for search input - sync with data changes
	let searchQuery = $state('');
	let activeTab: 'all' | 'events' | 'groups' = $state('all');
	let showFilters = $state(false);

	// Filter state
	let eventType = $state<string>('');
	let startDate = $state<string>('');
	let endDate = $state<string>('');
	let eventSize = $state<string>('');

	// Update search query and filters when data changes
	$effect(() => {
		searchQuery = data.query;
		eventType = data.filters.eventType || '';
		startDate = data.filters.startDate || '';
		endDate = data.filters.endDate || '';
		eventSize = data.filters.eventSize || '';
	});

	// Get current tab from URL or default to 'all'
	$effect(() => {
		const urlTab = $page.url.searchParams.get('tab');
		if (urlTab === 'events' || urlTab === 'groups') {
			activeTab = urlTab;
		} else {
			activeTab = 'all';
		}
	});

	// Check if any filters are active
	const hasActiveFilters = $derived(Boolean(eventType || startDate || endDate || eventSize));

	function handleSearch(event: Event) {
		event.preventDefault();
		if (searchQuery.trim()) {
			applySearch();
		}
	}

	function applySearch() {
		const url = new URL('/search', $page.url.origin);
		url.searchParams.set('q', searchQuery.trim());

		// Add filter params if set
		if (eventType) url.searchParams.set('eventType', eventType);
		if (startDate) url.searchParams.set('startDate', startDate);
		if (endDate) url.searchParams.set('endDate', endDate);
		if (eventSize) url.searchParams.set('eventSize', eventSize);

		goto(url.toString());
	}

	function clearFilters() {
		eventType = '';
		startDate = '';
		endDate = '';
		eventSize = '';
		applySearch();
	}

	function toggleFilters() {
		showFilters = !showFilters;
	}

	function setActiveTab(tab: 'all' | 'events' | 'groups') {
		activeTab = tab;
		// Update URL with tab param
		const url = new URL($page.url);
		url.searchParams.set('tab', tab);
		goto(url.toString(), { replaceState: true, noScroll: true });
	}

	// Computed results based on active tab
	const visibleEvents = $derived(
		activeTab === 'all' || activeTab === 'events' ? data.results.events : []
	);
	const visibleGroups = $derived(
		activeTab === 'all' || activeTab === 'groups' ? data.results.groups : []
	);

	const hasResults = $derived(data.results.eventsCount > 0 || data.results.groupsCount > 0);
	const totalResults = $derived(data.results.eventsCount + data.results.groupsCount);
</script>

<svelte:head>
	<title>Search - LetsHang</title>
	<meta name="description" content="Search for groups and events on LetsHang" />
</svelte:head>

<BaseLayout>
	<div class="min-h-screen bg-gray-50">
		<div class="max-w-4xl mx-auto px-4 py-8">
			<!-- Search Header -->
			<div class="mb-8">
				<h1 class="text-3xl font-bold text-gray-900 mb-4">Search</h1>

				<!-- Search Form -->
				<form onsubmit={handleSearch} class="mb-6">
					<div class="flex gap-2">
						<input
							type="text"
							bind:value={searchQuery}
							placeholder="Search for groups and events..."
							class="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
							aria-label="Search query"
						/>
						<button
							type="button"
							onclick={toggleFilters}
							class="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 {hasActiveFilters
								? 'bg-blue-50 border-blue-300'
								: 'bg-white'}"
							aria-label="Toggle filters"
							aria-expanded={showFilters}
						>
							<svg
								class="w-5 h-5 {hasActiveFilters ? 'text-blue-600' : 'text-gray-700'}"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
								/>
							</svg>
						</button>
						<button
							type="submit"
							class="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
						>
							Search
						</button>
					</div>

					<!-- Filter Panel -->
					{#if showFilters}
						<div class="mt-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
							<div class="flex justify-between items-center mb-4">
								<h3 class="text-sm font-medium text-gray-900">Filters</h3>
								{#if hasActiveFilters}
									<button
										type="button"
										onclick={clearFilters}
										class="text-sm text-blue-600 hover:text-blue-700"
									>
										Clear all
									</button>
								{/if}
							</div>

							<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
								<!-- Event Type Filter -->
								<div>
									<label for="eventType" class="block text-sm font-medium text-gray-700 mb-1">
										Event Type
									</label>
									<select
										id="eventType"
										bind:value={eventType}
										onchange={applySearch}
										class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
									>
										<option value="">All types</option>
										<option value="in_person">In-Person</option>
										<option value="online">Online</option>
										<option value="hybrid">Hybrid</option>
									</select>
								</div>

								<!-- Start Date Filter -->
								<div>
									<label for="startDate" class="block text-sm font-medium text-gray-700 mb-1">
										From Date
									</label>
									<input
										type="date"
										id="startDate"
										bind:value={startDate}
										onchange={applySearch}
										class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
									/>
								</div>

								<!-- End Date Filter -->
								<div>
									<label for="endDate" class="block text-sm font-medium text-gray-700 mb-1">
										To Date
									</label>
									<input
										type="date"
										id="endDate"
										bind:value={endDate}
										onchange={applySearch}
										class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
									/>
								</div>

								<!-- Event Size Filter -->
								<div>
									<label for="eventSize" class="block text-sm font-medium text-gray-700 mb-1">
										Event Size
									</label>
									<select
										id="eventSize"
										bind:value={eventSize}
										onchange={applySearch}
										class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
									>
										<option value="">All sizes</option>
										<option value="intimate">Intimate (&lt;10)</option>
										<option value="small">Small (10-20)</option>
										<option value="medium">Medium (20-50)</option>
										<option value="large">Large (50+)</option>
									</select>
								</div>
							</div>
						</div>
					{/if}
				</form>

				<!-- Results Summary -->
				{#if data.query}
					<div class="flex items-center gap-2 flex-wrap">
						<p class="text-sm text-gray-600">
							{#if hasResults}
								Found {totalResults} result{totalResults === 1 ? '' : 's'} for "{data.query}"
							{:else}
								No results found for "{data.query}"
							{/if}
						</p>
						{#if hasActiveFilters}
							<span
								class="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded"
							>
								Filters applied
							</span>
						{/if}
					</div>
				{/if}

				<!-- Error Message -->
				{#if data.error}
					<div class="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
						<p class="text-sm text-red-800">{data.error}</p>
					</div>
				{/if}
			</div>

			<!-- Tabs -->
			{#if hasResults}
				<div class="mb-6 border-b border-gray-200">
					<nav class="flex gap-8" aria-label="Search result tabs">
						<button
							onclick={() => setActiveTab('all')}
							class="py-3 px-1 border-b-2 font-medium text-sm transition-colors {activeTab === 'all'
								? 'border-blue-600 text-blue-600'
								: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
							aria-current={activeTab === 'all' ? 'page' : undefined}
						>
							All ({totalResults})
						</button>
						<button
							onclick={() => setActiveTab('events')}
							class="py-3 px-1 border-b-2 font-medium text-sm transition-colors {activeTab ===
							'events'
								? 'border-blue-600 text-blue-600'
								: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
							aria-current={activeTab === 'events' ? 'page' : undefined}
						>
							Events ({data.results.eventsCount})
						</button>
						<button
							onclick={() => setActiveTab('groups')}
							class="py-3 px-1 border-b-2 font-medium text-sm transition-colors {activeTab ===
							'groups'
								? 'border-blue-600 text-blue-600'
								: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
							aria-current={activeTab === 'groups' ? 'page' : undefined}
						>
							Groups ({data.results.groupsCount})
						</button>
					</nav>
				</div>
			{/if}

			<!-- Results -->
			<div class="space-y-8">
				<!-- Events Section -->
				{#if visibleEvents.length > 0}
					<section>
						{#if activeTab === 'all'}
							<h2 class="text-xl font-semibold text-gray-900 mb-4">
								Events ({data.results.eventsCount})
							</h2>
						{/if}
						<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
							{#each visibleEvents as event (event.id)}
								<EventCard {event} />
							{/each}
						</div>
					</section>
				{/if}

				<!-- Groups Section -->
				{#if visibleGroups.length > 0}
					<section>
						{#if activeTab === 'all'}
							<h2 class="text-xl font-semibold text-gray-900 mb-4">
								Groups ({data.results.groupsCount})
							</h2>
						{/if}
						<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
							{#each visibleGroups as group (group.id)}
								<GroupCard {group} />
							{/each}
						</div>
					</section>
				{/if}

				<!-- Empty State -->
				{#if !hasResults && data.query}
					<div class="text-center py-12">
						<svg
							class="mx-auto h-12 w-12 text-gray-400"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
							/>
						</svg>
						<h3 class="mt-4 text-lg font-medium text-gray-900">No results found</h3>
						<p class="mt-2 text-sm text-gray-500">
							Try adjusting your search terms or browse our categories.
						</p>
					</div>
				{/if}

				<!-- No Query State -->
				{#if !data.query}
					<div class="text-center py-12">
						<svg
							class="mx-auto h-12 w-12 text-gray-400"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
							/>
						</svg>
						<h3 class="mt-4 text-lg font-medium text-gray-900">Start searching</h3>
						<p class="mt-2 text-sm text-gray-500">
							Search for groups and events by name, description, or topic.
						</p>
					</div>
				{/if}
			</div>
		</div>
	</div>
</BaseLayout>
