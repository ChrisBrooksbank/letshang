<script lang="ts">
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import BaseLayout from '$lib/components/BaseLayout.svelte';

	export let data: PageData;

	$: event = data.event;
	$: attendees = data.attendees;
	$: checkInAvailable = data.checkInAvailable;
	$: checkInOpenTime = data.checkInOpenTime;
	$: stats = data.stats;

	let loading = false;
	let searchQuery = '';

	// Helper to get user data (Supabase may return array or object)
	function getUserData(users: unknown) {
		if (Array.isArray(users) && users.length > 0) {
			return users[0];
		}
		return users as { id: string; email: string; display_name: string; profile_photo_url: string };
	}

	// Filter attendees by search query
	$: filteredAttendees = attendees.filter((attendee) => {
		if (!searchQuery) return true;

		const query = searchQuery.toLowerCase();
		const user = getUserData(attendee.users);
		const displayName = user?.display_name?.toLowerCase() || '';
		const email = user?.email?.toLowerCase() || '';

		return displayName.includes(query) || email.includes(query);
	});

	// Split attendees into checked-in and not checked-in
	$: checkedInAttendees = filteredAttendees.filter((a) => a.checked_in_at !== null);
	$: notCheckedInAttendees = filteredAttendees.filter((a) => a.checked_in_at === null);

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

	function formatCheckInTime(timestamp: string): string {
		const date = new Date(timestamp);
		return date.toLocaleTimeString('en-US', {
			hour: 'numeric',
			minute: '2-digit'
		});
	}

	function getTimeUntilCheckIn(checkInTime: number): string {
		const now = Date.now();
		const diff = checkInTime - now;

		if (diff <= 0) return '';

		const hours = Math.floor(diff / (1000 * 60 * 60));
		const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

		if (hours > 0) {
			return `Opens in ${hours}h ${minutes}m`;
		}
		return `Opens in ${minutes}m`;
	}
</script>

<BaseLayout>
	<div class="max-w-4xl mx-auto">
		<!-- Header -->
		<div class="mb-6">
			<h1 class="text-3xl font-bold text-gray-900 mb-2">Check-in</h1>
			<p class="text-gray-600">{event.title}</p>
			<p class="text-sm text-gray-500">
				{formatDate(event.start_time)} at {formatTime(event.start_time)}
			</p>
		</div>

		<!-- Check-in Availability Notice -->
		{#if !checkInAvailable}
			<div class="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
				<div class="flex items-start gap-3">
					<svg
						class="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5"
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
					<div>
						<h3 class="text-lg font-semibold text-yellow-900 mb-1">Check-in not available yet</h3>
						<p class="text-yellow-800">
							Check-in opens 1 hour before the event.
							{getTimeUntilCheckIn(checkInOpenTime)}
						</p>
					</div>
				</div>
			</div>
		{/if}

		<!-- Stats -->
		<div class="mb-6 grid grid-cols-3 gap-4">
			<div class="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
				<div class="text-3xl font-bold text-blue-900">{stats.totalGoing}</div>
				<div class="text-sm text-blue-700 mt-1">Total RSVPs</div>
			</div>
			<div class="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
				<div class="text-3xl font-bold text-green-900">{stats.checkedInCount}</div>
				<div class="text-sm text-green-700 mt-1">Checked In</div>
			</div>
			<div class="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
				<div class="text-3xl font-bold text-gray-900">{stats.notCheckedInCount}</div>
				<div class="text-sm text-gray-700 mt-1">Not Checked In</div>
			</div>
		</div>

		<!-- Search Bar -->
		{#if attendees.length > 0}
			<div class="mb-6">
				<label for="search" class="block text-sm font-medium text-gray-700 mb-2">
					Search attendees
				</label>
				<input
					type="text"
					id="search"
					bind:value={searchQuery}
					placeholder="Search by name or email..."
					class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[44px]"
				/>
			</div>
		{/if}

		<!-- Attendee Lists -->
		{#if filteredAttendees.length === 0 && attendees.length === 0}
			<div class="text-center py-12 bg-gray-50 rounded-lg">
				<p class="text-gray-600">No attendees have RSVPed yet</p>
			</div>
		{:else if filteredAttendees.length === 0}
			<div class="text-center py-12 bg-gray-50 rounded-lg">
				<p class="text-gray-600">No attendees match your search</p>
			</div>
		{:else}
			<!-- Not Checked In Section -->
			{#if notCheckedInAttendees.length > 0}
				<div class="mb-8">
					<h2 class="text-xl font-semibold text-gray-900 mb-4">
						Not Checked In ({notCheckedInAttendees.length})
					</h2>
					<div class="space-y-3">
						{#each notCheckedInAttendees as attendee (attendee.id)}
							{@const user = getUserData(attendee.users)}
							<div
								class="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition"
							>
								<div class="flex items-center gap-3">
									{#if user?.profile_photo_url}
										<img
											src={user.profile_photo_url}
											alt={user.display_name || 'Attendee'}
											class="w-12 h-12 rounded-full object-cover"
										/>
									{:else}
										<div
											class="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center"
										>
											<svg
												class="w-6 h-6 text-gray-500"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
												xmlns="http://www.w3.org/2000/svg"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
												/>
											</svg>
										</div>
									{/if}
									<div>
										<p class="font-medium text-gray-900">
											{user?.display_name || 'Anonymous'}
										</p>
										<p class="text-sm text-gray-500">{user?.email}</p>
									</div>
								</div>
								<form
									method="POST"
									action="?/checkIn"
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
								>
									<input type="hidden" name="rsvp_id" value={attendee.id} />
									<button
										type="submit"
										disabled={loading || !checkInAvailable}
										class="px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
									>
										Check In
									</button>
								</form>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Checked In Section -->
			{#if checkedInAttendees.length > 0}
				<div class="mb-8">
					<h2 class="text-xl font-semibold text-gray-900 mb-4">
						Checked In ({checkedInAttendees.length})
					</h2>
					<div class="space-y-3">
						{#each checkedInAttendees as attendee (attendee.id)}
							{@const user = getUserData(attendee.users)}
							<div
								class="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-4"
							>
								<div class="flex items-center gap-3">
									{#if user?.profile_photo_url}
										<img
											src={user.profile_photo_url}
											alt={user.display_name || 'Attendee'}
											class="w-12 h-12 rounded-full object-cover"
										/>
									{:else}
										<div
											class="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center"
										>
											<svg
												class="w-6 h-6 text-gray-500"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
												xmlns="http://www.w3.org/2000/svg"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
												/>
											</svg>
										</div>
									{/if}
									<div>
										<p class="font-medium text-gray-900">
											{user?.display_name || 'Anonymous'}
										</p>
										<p class="text-sm text-gray-500">{user?.email}</p>
										{#if attendee.checked_in_at}
											<p class="text-xs text-green-700 mt-1">
												Checked in at {formatCheckInTime(attendee.checked_in_at)}
											</p>
										{/if}
									</div>
								</div>
								<form
									method="POST"
									action="?/uncheckIn"
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
								>
									<input type="hidden" name="rsvp_id" value={attendee.id} />
									<button
										type="submit"
										disabled={loading}
										class="px-4 py-2 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 transition min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
									>
										Undo
									</button>
								</form>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		{/if}

		<!-- Back to Event -->
		<div class="mt-8">
			<a
				href="/events/{event.id}"
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
				Back to Event
			</a>
		</div>
	</div>
</BaseLayout>
