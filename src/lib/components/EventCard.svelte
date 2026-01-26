<script lang="ts">
	import type { SearchEventResult } from '$lib/server/search';

	interface Props {
		event: SearchEventResult;
	}

	let { event }: Props = $props();

	const eventUrl = $derived(`/events/${event.id}`);

	function formatDate(dateString: string): string {
		const date = new Date(dateString);
		return date.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}

	function formatTime(dateString: string): string {
		const date = new Date(dateString);
		return date.toLocaleTimeString('en-US', {
			hour: 'numeric',
			minute: '2-digit'
		});
	}

	function getEventTypeLabel(type: string): string {
		if (type === 'in_person') return 'In-Person';
		if (type === 'online') return 'Online';
		if (type === 'hybrid') return 'Hybrid';
		return type;
	}
</script>

<a
	href={eventUrl}
	class="block bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200 overflow-hidden"
>
	<!-- Cover Image or Placeholder -->
	{#if event.cover_image_url}
		<div class="w-full h-40 bg-gray-200 overflow-hidden">
			<img src={event.cover_image_url} alt={event.title} class="w-full h-full object-cover" />
		</div>
	{:else}
		<div class="w-full h-40 bg-gradient-to-r from-blue-500 to-purple-600"></div>
	{/if}

	<!-- Content -->
	<div class="p-4">
		<!-- Title -->
		<h3 class="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
			{event.title}
		</h3>

		<!-- Date & Time -->
		<div class="flex items-center gap-2 text-sm text-gray-600 mb-2">
			<svg class="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
				<path
					fill-rule="evenodd"
					d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
					clip-rule="evenodd"
				/>
			</svg>
			<span>{formatDate(event.start_time)} at {formatTime(event.start_time)}</span>
		</div>

		<!-- Location or Event Type -->
		<div class="flex items-center gap-2 text-sm text-gray-600 mb-2">
			{#if event.event_type === 'in_person' || event.event_type === 'hybrid'}
				<svg class="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
					<path
						fill-rule="evenodd"
						d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
						clip-rule="evenodd"
					/>
				</svg>
				<span class="line-clamp-1">{event.venue_name || event.venue_address || 'Location TBA'}</span
				>
			{:else}
				<svg class="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
					<path
						d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z"
					/>
				</svg>
				<span>{getEventTypeLabel(event.event_type)}</span>
			{/if}
		</div>

		<!-- Description -->
		{#if event.description}
			<p class="text-sm text-gray-700 line-clamp-2 mb-3">
				{event.description}
			</p>
		{/if}

		<!-- Event Type Badge -->
		<div class="flex items-center gap-2">
			<span
				class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
			>
				{getEventTypeLabel(event.event_type)}
			</span>
			{#if event.capacity}
				<span class="text-xs text-gray-500">Capacity: {event.capacity}</span>
			{/if}
		</div>
	</div>
</a>
