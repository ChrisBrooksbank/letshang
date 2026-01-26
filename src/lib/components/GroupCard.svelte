<script lang="ts">
	import type { SearchGroupResult } from '$lib/server/search';

	interface Props {
		group: SearchGroupResult;
	}

	let { group }: Props = $props();

	const groupUrl = $derived(`/groups/${group.id}`);
</script>

<a
	href={groupUrl}
	class="block bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200 overflow-hidden"
>
	<!-- Cover Image or Placeholder -->
	{#if group.cover_image_url}
		<div class="w-full h-40 bg-gray-200 overflow-hidden">
			<img src={group.cover_image_url} alt={group.name} class="w-full h-full object-cover" />
		</div>
	{:else}
		<div class="w-full h-40 bg-gradient-to-r from-green-500 to-teal-600"></div>
	{/if}

	<!-- Content -->
	<div class="p-4">
		<!-- Name -->
		<h3 class="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
			{group.name}
		</h3>

		<!-- Location if available -->
		{#if group.location}
			<div class="flex items-center gap-2 text-sm text-gray-600 mb-2">
				<svg class="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
					<path
						fill-rule="evenodd"
						d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
						clip-rule="evenodd"
					/>
				</svg>
				<span class="line-clamp-1">{group.location}</span>
			</div>
		{/if}

		<!-- Description -->
		{#if group.description}
			<p class="text-sm text-gray-700 line-clamp-3 mb-3">
				{group.description}
			</p>
		{/if}

		<!-- Group Type Badge -->
		<div class="flex items-center gap-2">
			<span
				class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {group.group_type ===
				'public'
					? 'bg-green-100 text-green-800'
					: 'bg-purple-100 text-purple-800'}"
			>
				{group.group_type === 'public' ? 'Public' : 'Private'}
			</span>
		</div>
	</div>
</a>
