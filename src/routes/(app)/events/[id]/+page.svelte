<script lang="ts">
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import BaseLayout from '$lib/components/BaseLayout.svelte';
	import EventMap from '$lib/components/EventMap.svelte';
	import { getDirectionsUrl } from '$lib/utils/geocoding';

	export let data: PageData;

	$: event = data.event;
	$: userRsvp = data.userRsvp;
	$: counts = data.counts;
	$: userId = data.userId;
	$: isHost = event.creator_id === userId;

	let loading = false;
	let selectedAttendanceMode: 'in_person' | 'online' | null = userRsvp?.attendance_mode || null;
	let showAttendanceModeError = false;

	function formatDate(dateString: string): string {
		const date = new Date(dateString);
		return date.toLocaleDateString('en-US', {
			weekday: 'long',
			year: 'numeric',
			month: 'long',
			day: 'numeric'
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

<BaseLayout>
	<div class="max-w-3xl mx-auto">
		<!-- Event Header -->
		<div class="mb-6">
			<h1 class="text-3xl font-bold text-gray-900 mb-2">{event.title}</h1>
			<div class="flex flex-wrap gap-2 text-sm text-gray-600">
				<span class="flex items-center gap-1">
					<svg
						class="w-4 h-4"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
						xmlns="http://www.w3.org/2000/svg"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
						/>
					</svg>
					{formatDate(event.start_time)}
				</span>
				<span class="flex items-center gap-1">
					<svg
						class="w-4 h-4"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
						xmlns="http://www.w3.org/2000/svg"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
					{formatTime(event.start_time)}
				</span>
			</div>
		</div>

		<!-- Event Type Badge -->
		<div class="mb-6">
			<span
				class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
			>
				{getEventTypeLabel(event.event_type)}
			</span>
		</div>

		<!-- Format Tags -->
		{#if event.format_tags && event.format_tags.length > 0}
			<div class="mb-6">
				<h3 class="text-sm font-medium text-gray-700 mb-2">Event Format</h3>
				<div class="flex flex-wrap gap-2">
					{#each event.format_tags as tag}
						<span
							class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800"
						>
							{#if tag === 'speaker'}Speaker{/if}
							{#if tag === 'workshop'}Workshop{/if}
							{#if tag === 'activity'}Activity{/if}
							{#if tag === 'discussion'}Discussion{/if}
							{#if tag === 'mixer'}Mixer{/if}
							{#if tag === 'hangout'}Hangout{/if}
						</span>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Accessibility Tags -->
		{#if event.accessibility_tags && event.accessibility_tags.length > 0}
			<div class="mb-6">
				<h3 class="text-sm font-medium text-gray-700 mb-2">Who's Welcome</h3>
				<div class="flex flex-wrap gap-2">
					{#each event.accessibility_tags as tag}
						<span
							class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800"
						>
							{#if tag === 'first_timer_friendly'}First-Timer Friendly{/if}
							{#if tag === 'structured_activity'}Structured Activity{/if}
							{#if tag === 'low_pressure'}Low-Pressure{/if}
							{#if tag === 'beginner_welcome'}Beginner Welcome{/if}
						</span>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Host Actions -->
		{#if isHost}
			<div class="mb-6 bg-purple-50 border border-purple-200 rounded-lg p-4">
				<h2 class="text-lg font-semibold text-purple-900 mb-3">Host Actions</h2>
				<a
					href="/events/{event.id}/checkin"
					class="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition min-h-[44px]"
				>
					<svg
						class="w-5 h-5"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
						xmlns="http://www.w3.org/2000/svg"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
						/>
					</svg>
					Manage Check-in
				</a>
			</div>
		{/if}

		<!-- Attendee Counts -->
		<div class="bg-gray-50 rounded-lg p-4 mb-6">
			<div class="flex gap-6 text-sm">
				<div>
					<span class="font-semibold text-gray-900">{counts.going}</span>
					{#if event.capacity}
						<span class="text-gray-600 ml-1">/ {event.capacity} Going</span>
					{:else}
						<span class="text-gray-600 ml-1">Going</span>
					{/if}
				</div>
				<div>
					<span class="font-semibold text-gray-900">{counts.interested}</span>
					<span class="text-gray-600 ml-1">Interested</span>
				</div>
				{#if counts.waitlisted > 0}
					<div>
						<span class="font-semibold text-gray-900">{counts.waitlisted}</span>
						<span class="text-gray-600 ml-1">Waitlisted</span>
					</div>
				{/if}
			</div>
			{#if event.capacity}
				{@const spotsLeft = event.capacity - counts.going}
				{@const percentageFull = (counts.going / event.capacity) * 100}
				{#if spotsLeft > 0}
					<div class="mt-2 text-xs text-gray-600">
						{spotsLeft}
						{spotsLeft === 1 ? 'spot' : 'spots'} left
					</div>
					{#if percentageFull >= 80}
						<div class="mt-2 text-xs font-medium text-orange-600">Filling up fast!</div>
					{/if}
				{:else}
					<div class="mt-2 text-xs font-medium text-red-600">Event is at capacity</div>
					{#if counts.waitlisted > 0}
						<div class="mt-1 text-xs text-gray-600">
							{counts.waitlisted}
							{counts.waitlisted === 1 ? 'person' : 'people'} on waitlist
						</div>
					{/if}
				{/if}
			{/if}
		</div>

		<!-- Waitlist Status -->
		{#if userRsvp?.status === 'waitlisted'}
			<div class="mb-6 bg-purple-50 border border-purple-200 rounded-lg p-4">
				<div class="flex items-center gap-2 mb-2">
					<svg
						class="w-5 h-5 text-purple-600"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
						xmlns="http://www.w3.org/2000/svg"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
					<h3 class="text-lg font-semibold text-purple-900">You're on the waitlist!</h3>
				</div>
				{#if userRsvp.waitlist_position}
					<p class="text-purple-800">
						You're <span class="font-bold">#{userRsvp.waitlist_position}</span> in line. We'll notify
						you if a spot opens up!
					</p>
				{:else}
					<p class="text-purple-800">
						You're on the waitlist. We'll notify you if a spot opens up!
					</p>
				{/if}
			</div>
		{/if}

		<!-- RSVP Selector -->
		<div class="mb-8">
			<h2 class="text-lg font-semibold text-gray-900 mb-3">Are you attending?</h2>

			<!-- Attendance Mode Selector for Hybrid Events -->
			{#if event.event_type === 'hybrid'}
				<div class="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
					<fieldset>
						<legend class="block text-sm font-medium text-gray-900 mb-2">
							How will you attend?
						</legend>
						<div class="grid grid-cols-2 gap-3">
							<button
								type="button"
								onclick={() => {
									selectedAttendanceMode = 'in_person';
									showAttendanceModeError = false;
								}}
								class="flex items-center justify-center p-3 rounded-lg border-2 transition-all min-h-[44px] {selectedAttendanceMode ===
								'in_person'
									? 'border-blue-600 bg-blue-100 text-blue-700'
									: 'border-gray-300 bg-white text-gray-700 hover:border-blue-400 hover:bg-blue-50'}"
							>
								<svg
									class="w-5 h-5 mr-2"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
									xmlns="http://www.w3.org/2000/svg"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
									/>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
									/>
								</svg>
								<span class="font-medium">In-Person</span>
							</button>
							<button
								type="button"
								onclick={() => {
									selectedAttendanceMode = 'online';
									showAttendanceModeError = false;
								}}
								class="flex items-center justify-center p-3 rounded-lg border-2 transition-all min-h-[44px] {selectedAttendanceMode ===
								'online'
									? 'border-blue-600 bg-blue-100 text-blue-700'
									: 'border-gray-300 bg-white text-gray-700 hover:border-blue-400 hover:bg-blue-50'}"
							>
								<svg
									class="w-5 h-5 mr-2"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
									xmlns="http://www.w3.org/2000/svg"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
									/>
								</svg>
								<span class="font-medium">Online</span>
							</button>
						</div>
						{#if showAttendanceModeError}
							<p class="text-red-600 text-sm mt-2">Please select how you'll attend</p>
						{/if}
					</fieldset>
				</div>
			{/if}

			<form
				method="POST"
				action="?/rsvp"
				use:enhance={() => {
					// Validate attendance mode for hybrid events before submitting
					if (event.event_type === 'hybrid' && !selectedAttendanceMode) {
						showAttendanceModeError = true;
						return async () => {
							// Don't submit the form
						};
					}

					loading = true;
					return async ({ update, result }) => {
						await update();
						loading = false;
						if (result.type === 'success') {
							await invalidateAll();
						}
					};
				}}
			>
				<!-- Hidden field for attendance mode -->
				{#if event.event_type === 'hybrid' && selectedAttendanceMode}
					<input type="hidden" name="attendance_mode" value={selectedAttendanceMode} />
				{/if}

				<div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
					<!-- Going Button -->
					<button
						type="submit"
						name="status"
						value="going"
						disabled={loading}
						class="flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all min-h-[44px] {userRsvp?.status ===
						'going'
							? 'border-green-600 bg-green-50 text-green-700'
							: 'border-gray-300 bg-white text-gray-700 hover:border-green-400 hover:bg-green-50'} {loading
							? 'opacity-50 cursor-not-allowed'
							: ''}"
					>
						<svg
							class="w-6 h-6 mb-1"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							xmlns="http://www.w3.org/2000/svg"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M5 13l4 4L19 7"
							/>
						</svg>
						<span class="font-medium">Going</span>
						<span class="text-xs mt-1">Count me in</span>
					</button>

					<!-- Interested Button -->
					<button
						type="submit"
						name="status"
						value="interested"
						disabled={loading}
						class="flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all min-h-[44px] {userRsvp?.status ===
						'interested'
							? 'border-yellow-600 bg-yellow-50 text-yellow-700'
							: 'border-gray-300 bg-white text-gray-700 hover:border-yellow-400 hover:bg-yellow-50'} {loading
							? 'opacity-50 cursor-not-allowed'
							: ''}"
					>
						<svg
							class="w-6 h-6 mb-1"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							xmlns="http://www.w3.org/2000/svg"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
							/>
						</svg>
						<span class="font-medium">Interested</span>
						<span class="text-xs mt-1">Keep me posted</span>
					</button>

					<!-- Can't Go Button -->
					<button
						type="submit"
						name="status"
						value="not_going"
						disabled={loading}
						class="flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all min-h-[44px] {userRsvp?.status ===
						'not_going'
							? 'border-red-600 bg-red-50 text-red-700'
							: 'border-gray-300 bg-white text-gray-700 hover:border-red-400 hover:bg-red-50'} {loading
							? 'opacity-50 cursor-not-allowed'
							: ''}"
					>
						<svg
							class="w-6 h-6 mb-1"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							xmlns="http://www.w3.org/2000/svg"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
						<span class="font-medium">Can't Go</span>
						<span class="text-xs mt-1">Maybe next time</span>
					</button>
				</div>
			</form>

			<!-- Cancel RSVP Option -->
			{#if userRsvp}
				<form
					method="POST"
					action="?/cancelRsvp"
					use:enhance={() => {
						loading = true;
						return async ({ update, result }) => {
							await update();
							loading = false;
							if (result.type === 'success') {
								await invalidateAll();
							}
						};
					}}
					class="mt-3"
				>
					<button
						type="submit"
						disabled={loading}
						class="text-sm text-gray-600 hover:text-gray-900 underline {loading
							? 'opacity-50 cursor-not-allowed'
							: ''}"
					>
						Cancel my RSVP
					</button>
				</form>
			{/if}
		</div>

		<!-- Event Details -->
		{#if event.description}
			<div class="mb-6">
				<h2 class="text-lg font-semibold text-gray-900 mb-2">About this event</h2>
				<p class="text-gray-700 whitespace-pre-wrap">{event.description}</p>
			</div>
		{/if}

		<!-- Location Details -->
		{#if event.event_type === 'in_person' || event.event_type === 'hybrid'}
			<div class="mb-6">
				<h2 class="text-lg font-semibold text-gray-900 mb-2">Location</h2>
				{#if event.venue_name}
					<p class="font-medium text-gray-900">{event.venue_name}</p>
				{/if}
				{#if event.venue_address}
					<p class="text-gray-700">{event.venue_address}</p>

					<!-- Map Display -->
					{#if event.venue_lat && event.venue_lng}
						<div class="mb-3 overflow-hidden rounded-lg">
							<EventMap
								latitude={event.venue_lat}
								longitude={event.venue_lng}
								markerLabel={event.venue_name || 'Event Location'}
								height="300px"
							/>
						</div>

						<!-- Get Directions Link -->
						<a
							href={getDirectionsUrl(event.venue_lat, event.venue_lng)}
							target="_blank"
							rel="noopener noreferrer"
							class="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition min-h-[44px]"
						>
							<svg
								class="w-5 h-5"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
								xmlns="http://www.w3.org/2000/svg"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
								/>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
								/>
							</svg>
							Get Directions
						</a>
					{/if}
				{/if}
			</div>
		{/if}

		<!-- Video Link for Online/Hybrid Events -->
		{#if (event.event_type === 'online' || event.event_type === 'hybrid') && event.video_link}
			{#if userRsvp?.status === 'going' || userRsvp?.status === 'interested'}
				<div class="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
					<h2 class="text-lg font-semibold text-gray-900 mb-2">Join Online</h2>
					<a
						href={event.video_link}
						target="_blank"
						rel="noopener noreferrer"
						class="text-blue-600 hover:text-blue-800 underline break-all"
					>
						{event.video_link}
					</a>
				</div>
			{:else}
				<div class="mb-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
					<p class="text-gray-600 text-sm">RSVP as "Going" or "Interested" to see the video link</p>
				</div>
			{/if}
		{/if}

		<!-- Back to Dashboard -->
		<div class="mt-8">
			<a
				href="/dashboard"
				class="text-blue-600 hover:text-blue-800 flex items-center gap-1 min-h-[44px] items-center"
			>
				<svg
					class="w-4 h-4"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
					xmlns="http://www.w3.org/2000/svg"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M15 19l-7-7 7-7"
					/>
				</svg>
				Back to Dashboard
			</a>
		</div>
	</div>
</BaseLayout>
