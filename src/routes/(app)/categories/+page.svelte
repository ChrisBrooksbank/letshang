<script lang="ts">
	import { CATEGORY_METADATA } from '$lib/schemas/categories';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Browse Categories - LetsHang</title>
	<meta name="description" content="Explore groups and events by category" />
</svelte:head>

<div class="container mx-auto px-4 py-8">
	<!-- Page header -->
	<div class="mb-8">
		<h1 class="text-3xl font-bold text-gray-900 mb-2">Browse by Category</h1>
		<p class="text-gray-600">Discover groups and events based on your interests</p>
	</div>

	<!-- Category grid -->
	<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
		{#each data.categoryStats as stat}
			{@const metadata = CATEGORY_METADATA[stat.category]}
			<a
				href="/categories/{metadata.slug}"
				class="block p-6 bg-white border border-gray-200 rounded-lg shadow hover:shadow-lg transition-shadow"
			>
				<!-- Icon and name -->
				<div class="flex items-center gap-3 mb-3">
					<span class="text-4xl" aria-hidden="true">{metadata.icon}</span>
					<h2 class="text-2xl font-bold text-gray-900">{metadata.name}</h2>
				</div>

				<!-- Description -->
				<p class="text-gray-600 mb-4 text-sm">{metadata.description}</p>

				<!-- Stats -->
				<div class="flex gap-4 text-sm text-gray-500">
					<div>
						<span class="font-semibold text-gray-900">{stat.groupCount}</span>
						{stat.groupCount === 1 ? 'group' : 'groups'}
					</div>
					{#if stat.eventCount > 0}
						<div>
							<span class="font-semibold text-gray-900">{stat.eventCount}</span>
							{stat.eventCount === 1 ? 'event' : 'events'}
						</div>
					{/if}
					<div>
						<span class="font-semibold text-gray-900">{stat.topicCount}</span>
						{stat.topicCount === 1 ? 'topic' : 'topics'}
					</div>
				</div>
			</a>
		{/each}
	</div>

	<!-- Empty state -->
	{#if data.categoryStats.length === 0}
		<div class="text-center py-12">
			<p class="text-gray-500 text-lg">No categories available yet.</p>
		</div>
	{/if}
</div>

<style>
	.container {
		max-width: 1200px;
	}
</style>
