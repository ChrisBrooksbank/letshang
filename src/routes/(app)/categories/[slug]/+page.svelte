<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>{data.category.name} - Browse Categories - LetsHang</title>
	<meta name="description" content={data.category.description} />
</svelte:head>

<div class="container mx-auto px-4 py-8">
	<!-- Category header -->
	<div class="mb-8">
		<div class="flex items-center gap-3 mb-2">
			<span class="text-5xl" aria-hidden="true">{data.category.icon}</span>
			<h1 class="text-3xl font-bold text-gray-900">{data.category.name}</h1>
		</div>
		<p class="text-gray-600">{data.category.description}</p>
	</div>

	<!-- Back link -->
	<div class="mb-6">
		<a href="/categories" class="text-blue-600 hover:text-blue-800 text-sm">
			← Back to all categories
		</a>
	</div>

	<!-- Groups section -->
	<section class="mb-12">
		<h2 class="text-2xl font-bold text-gray-900 mb-4">
			Groups ({data.groups.length})
		</h2>

		{#if data.groups.length > 0}
			<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
				{#each data.groups as group}
					<a
						href="/groups/{group.id}"
						class="block bg-white border border-gray-200 rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden"
					>
						<!-- Cover image -->
						{#if group.cover_image_url}
							<img src={group.cover_image_url} alt="" class="w-full h-48 object-cover" />
						{:else}
							<div class="w-full h-48 bg-gradient-to-br from-blue-500 to-purple-600"></div>
						{/if}

						<!-- Content -->
						<div class="p-4">
							<h3 class="font-bold text-lg text-gray-900 mb-2 line-clamp-2">
								{group.name}
							</h3>

							{#if group.description}
								<p class="text-gray-600 text-sm mb-3 line-clamp-2">
									{group.description}
								</p>
							{/if}

							<!-- Topics -->
							{#if group.topics.length > 0}
								<div class="flex flex-wrap gap-2 mb-3">
									{#each group.topics.slice(0, 3) as topic}
										<span class="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
											{topic.name}
										</span>
									{/each}
									{#if group.topics.length > 3}
										<span class="inline-block px-2 py-1 text-gray-500 text-xs">
											+{group.topics.length - 3} more
										</span>
									{/if}
								</div>
							{/if}

							<!-- Stats -->
							<div class="text-sm text-gray-500">
								<span class="font-semibold text-gray-900">{group.member_count}</span>
								{group.member_count === 1 ? 'member' : 'members'}
							</div>
						</div>
					</a>
				{/each}
			</div>
		{:else}
			<div class="text-center py-12 bg-gray-50 rounded-lg">
				<p class="text-gray-500">No groups in this category yet.</p>
				<a href="/groups/create" class="text-blue-600 hover:text-blue-800 mt-2 inline-block">
					Create the first group
				</a>
			</div>
		{/if}
	</section>

	<!-- Events section -->
	<section>
		<h2 class="text-2xl font-bold text-gray-900 mb-4">
			Events ({data.events.length})
		</h2>

		{#if data.events.length > 0}
			<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
				{#each data.events as event}
					<!-- Event card will go here when events get category support -->
					<div class="p-4 bg-white border border-gray-200 rounded-lg">
						<p>Event: {JSON.stringify(event)}</p>
					</div>
				{/each}
			</div>
		{:else}
			<div class="text-center py-12 bg-gray-50 rounded-lg">
				<p class="text-gray-500">
					No standalone events in this category yet. Check the groups above for their events!
				</p>
			</div>
		{/if}
	</section>
</div>

<style>
	.container {
		max-width: 1200px;
	}

	.line-clamp-2 {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
		line-clamp: 2; /* Standard property for compatibility */
	}
</style>
