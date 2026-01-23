<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';
	import BaseLayout from '$lib/components/BaseLayout.svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const group = $derived(data.group);
	const topics: Array<{ id: string; name: string; category: string }> = $derived(data.topics || []);
	const memberCount = $derived(data.memberCount);
	const upcomingEventsCount = $derived(data.upcomingEventsCount);
	const userMembership = $derived(data.userMembership);
	const hasPendingRequest = $derived(data.hasPendingRequest);
	const isAuthenticated = $derived(data.isAuthenticated);

	// Determine user's relationship to the group
	const isMember = $derived(userMembership?.status === 'active');
	const canJoin = $derived(
		isAuthenticated && !isMember && !hasPendingRequest && group.group_type === 'public'
	);
	const canRequestJoin = $derived(
		isAuthenticated && !isMember && !hasPendingRequest && group.group_type === 'private'
	);

	// Check if user is leadership (can manage members)
	const isLeadership = $derived(
		userMembership?.role === 'organizer' ||
			userMembership?.role === 'co_organizer' ||
			userMembership?.role === 'assistant_organizer'
	);
</script>

<svelte:head>
	<title>{group.name} - LetsHang</title>
	<meta name="description" content={group.description || `Join ${group.name} on LetsHang`} />
</svelte:head>

<BaseLayout>
	<div class="min-h-screen bg-gray-50">
		<!-- Cover Image -->
		{#if group.cover_image_url}
			<div class="w-full h-64 md:h-80 bg-gray-200 overflow-hidden">
				<img
					src={group.cover_image_url}
					alt="{group.name} cover"
					class="w-full h-full object-cover"
				/>
			</div>
		{:else}
			<div class="w-full h-64 md:h-80 bg-gradient-to-r from-blue-500 to-purple-600"></div>
		{/if}

		<!-- Main Content -->
		<div class="max-w-4xl mx-auto px-4 py-8">
			<!-- Header Section -->
			<div class="bg-white rounded-lg shadow-sm p-6 -mt-16 relative z-10 mb-6">
				<div class="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
					<!-- Group Info -->
					<div class="flex-1">
						<h1 class="text-3xl font-bold text-gray-900 mb-2">{group.name}</h1>

						<!-- Topics -->
						{#if topics.length > 0}
							<div class="flex flex-wrap gap-2 mb-4">
								{#each topics as topic}
									<span
										class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
									>
										{topic.name}
									</span>
								{/each}
							</div>
						{/if}

						<!-- Stats -->
						<div class="flex flex-wrap gap-6 text-sm text-gray-600">
							<div class="flex items-center gap-2">
								<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
									<path
										d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"
									/>
								</svg>
								<span>{memberCount} {memberCount === 1 ? 'member' : 'members'}</span>
							</div>

							{#if upcomingEventsCount > 0}
								<div class="flex items-center gap-2">
									<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
										<path
											fill-rule="evenodd"
											d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
											clip-rule="evenodd"
										/>
									</svg>
									<span
										>{upcomingEventsCount}
										{upcomingEventsCount === 1 ? 'upcoming event' : 'upcoming events'}</span
									>
								</div>
							{/if}

							{#if group.location}
								<div class="flex items-center gap-2">
									<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
										<path
											fill-rule="evenodd"
											d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
											clip-rule="evenodd"
										/>
									</svg>
									<span>{group.location}</span>
								</div>
							{/if}

							<div class="flex items-center gap-2">
								<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
									<path
										fill-rule="evenodd"
										d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
										clip-rule="evenodd"
									/>
								</svg>
								<span class="capitalize">{group.group_type}</span>
							</div>
						</div>
					</div>

					<!-- Action Buttons -->
					<div class="flex flex-col gap-3 md:w-48">
						{#if isMember}
							<div
								class="px-6 py-3 bg-green-50 text-green-700 font-medium rounded-lg border border-green-200 text-center"
							>
								✓ Member
							</div>
						{:else if hasPendingRequest}
							<div
								class="px-6 py-3 bg-yellow-50 text-yellow-700 font-medium rounded-lg border border-yellow-200 text-center"
							>
								Request Pending
							</div>
						{:else if canJoin || canRequestJoin}
							<form method="POST" action="?/join" use:enhance>
								<button
									type="submit"
									class="w-full px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 transition"
								>
									{canJoin ? 'Join Group' : 'Request to Join'}
								</button>
							</form>
						{:else if !isAuthenticated}
							<a
								href="/login?redirect=/groups/{group.id}"
								class="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 transition text-center"
							>
								Sign In to Join
							</a>
						{/if}

						{#if form?.success}
							<div class="text-sm text-green-600 text-center" role="alert">
								{form.message}
							</div>
						{:else if form?.message}
							<div class="text-sm text-red-600 text-center" role="alert">
								{form.message}
							</div>
						{/if}
					</div>
				</div>
			</div>

			<!-- About Section -->
			<div class="bg-white rounded-lg shadow-sm p-6 mb-6">
				<h2 class="text-xl font-semibold text-gray-900 mb-4">About</h2>
				{#if group.description}
					<p class="text-gray-700 whitespace-pre-wrap leading-relaxed">
						{group.description}
					</p>
				{:else}
					<p class="text-gray-500 italic">No description provided yet.</p>
				{/if}
			</div>

			<!-- Organizer Section -->
			<div class="bg-white rounded-lg shadow-sm p-6 mb-6">
				<h2 class="text-xl font-semibold text-gray-900 mb-4">Organized By</h2>
				<div class="flex items-center gap-4">
					{#if group.organizer?.avatar_url}
						<img
							src={group.organizer.avatar_url}
							alt={group.organizer.display_name || 'Organizer'}
							class="w-12 h-12 rounded-full object-cover"
						/>
					{:else}
						<div
							class="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-lg"
						>
							{(group.organizer?.display_name || 'U').charAt(0).toUpperCase()}
						</div>
					{/if}
					<div>
						<p class="font-medium text-gray-900">
							{group.organizer?.display_name || 'Anonymous'}
						</p>
						<p class="text-sm text-gray-500">Organizer</p>
					</div>
				</div>
			</div>

			<!-- Leadership Actions -->
			{#if isLeadership}
				<div class="bg-white rounded-lg shadow-sm p-6 mb-6">
					<h2 class="text-xl font-semibold text-gray-900 mb-4">Group Management</h2>
					<div class="flex flex-wrap gap-3">
						<a
							href="/groups/{group.id}/members"
							class="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 transition"
						>
							Manage Members
						</a>
					</div>
				</div>
			{/if}

			<!-- Upcoming Events Section - Placeholder -->
			{#if isMember && upcomingEventsCount > 0}
				<div class="bg-white rounded-lg shadow-sm p-6">
					<h2 class="text-xl font-semibold text-gray-900 mb-4">Upcoming Events</h2>
					<p class="text-gray-600 italic">
						{upcomingEventsCount} upcoming
						{upcomingEventsCount === 1 ? 'event' : 'events'} (events list coming soon)
					</p>
				</div>
			{/if}
		</div>
	</div>
</BaseLayout>
