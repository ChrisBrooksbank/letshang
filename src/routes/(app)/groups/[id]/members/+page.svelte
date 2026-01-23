<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';
	import BaseLayout from '$lib/components/BaseLayout.svelte';
	import {
		ROLE_DISPLAY_NAMES,
		ROLE_DESCRIPTIONS,
		getAssignableRoles,
		canModifyMember,
		type GroupMemberRole
	} from '$lib/schemas/group-members';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const group = $derived(data.group);
	const members = $derived(data.members);
	const currentUserRole = $derived(data.currentUserRole as GroupMemberRole);
	const organizerCount = $derived(data.organizerCount);

	// Track which member is being edited
	let editingMemberId = $state<string | null>(null);
	let confirmRemoveMemberId = $state<string | null>(null);

	// Search and filter state
	let searchQuery = $state('');
	let roleFilter = $state<GroupMemberRole | 'all'>('all');

	// Get assignable roles for current user
	const assignableRoles = $derived(getAssignableRoles(currentUserRole));

	// Filtered members based on search and role filter
	const filteredMembers = $derived.by(() => {
		let result = members;

		// Apply search filter
		if (searchQuery.trim()) {
			const query = searchQuery.toLowerCase();
			result = result.filter((member) => {
				const displayName = member.user?.display_name?.toLowerCase() || '';
				return displayName.includes(query);
			});
		}

		// Apply role filter
		if (roleFilter !== 'all') {
			result = result.filter((member) => member.role === roleFilter);
		}

		return result;
	});

	// Check if user can modify a specific member
	function canUserModifyMember(memberRole: GroupMemberRole): boolean {
		return canModifyMember(currentUserRole, memberRole);
	}

	// Check if this is the last organizer
	function isLastOrganizer(memberRole: string): boolean {
		return memberRole === 'organizer' && organizerCount <= 1;
	}

	// Format date for display
	function formatDate(dateString: string): string {
		const date = new Date(dateString);
		return date.toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}
</script>

<svelte:head>
	<title>Manage Members - {group.name} - LetsHang</title>
</svelte:head>

<BaseLayout>
	<div class="min-h-screen bg-gray-50">
		<div class="max-w-6xl mx-auto px-4 py-8">
			<!-- Header -->
			<div class="mb-8">
				<nav class="text-sm text-gray-600 mb-2">
					<a href="/groups/{group.id}" class="hover:text-blue-600">← Back to {group.name}</a>
				</nav>
				<h1 class="text-3xl font-bold text-gray-900">Manage Members</h1>
				<p class="text-gray-600 mt-2">
					{members.length} active {members.length === 1 ? 'member' : 'members'}
				</p>
			</div>

			<!-- Action feedback -->
			{#if form?.success}
				<div
					class="mb-6 p-4 bg-green-50 border border-green-200 text-green-800 rounded-lg"
					role="alert"
				>
					{form.message}
				</div>
			{:else if form?.message}
				<div class="mb-6 p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg" role="alert">
					{form.message}
				</div>
			{/if}

			<!-- Search and Filter -->
			<div class="mb-6 bg-white rounded-lg shadow-sm p-6">
				<div class="flex flex-col sm:flex-row gap-4">
					<!-- Search Input -->
					<div class="flex-1">
						<label for="search" class="block text-sm font-medium text-gray-700 mb-2">
							Search members
						</label>
						<input
							type="text"
							id="search"
							bind:value={searchQuery}
							placeholder="Search by name..."
							class="block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
						/>
					</div>

					<!-- Role Filter -->
					<div class="sm:w-64">
						<label for="roleFilter" class="block text-sm font-medium text-gray-700 mb-2">
							Filter by role
						</label>
						<select
							id="roleFilter"
							bind:value={roleFilter}
							class="block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
						>
							<option value="all">All roles</option>
							<option value="organizer">Organizer</option>
							<option value="co_organizer">Co-organizer</option>
							<option value="assistant_organizer">Assistant Organizer</option>
							<option value="event_organizer">Event Organizer</option>
							<option value="member">Member</option>
						</select>
					</div>
				</div>

				<!-- Results count -->
				<div class="mt-4 text-sm text-gray-600">
					Showing {filteredMembers.length} of {members.length}
					{members.length === 1 ? 'member' : 'members'}
				</div>
			</div>

			<!-- Members List -->
			<div class="bg-white rounded-lg shadow-sm overflow-hidden">
				<div class="overflow-x-auto">
					<table class="w-full">
						<thead class="bg-gray-50 border-b border-gray-200">
							<tr>
								<th
									class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
								>
									Member
								</th>
								<th
									class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
								>
									Role
								</th>
								<th
									class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
								>
									Joined
								</th>
								<th
									class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
								>
									Actions
								</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-gray-200">
							{#each filteredMembers as member}
								{@const memberRole = member.role as GroupMemberRole}
								{@const canModify = canUserModifyMember(memberRole)}
								{@const isEditing = editingMemberId === member.id}
								{@const isConfirmingRemove = confirmRemoveMemberId === member.id}

								<tr class="hover:bg-gray-50">
									<!-- Member Info -->
									<td class="px-6 py-4">
										<div class="flex items-center gap-3">
											{#if member.user?.profile_photo_url}
												<img
													src={member.user.profile_photo_url}
													alt={member.user.display_name || 'Member'}
													class="w-10 h-10 rounded-full object-cover"
												/>
											{:else}
												<div
													class="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold"
												>
													{(member.user?.display_name || 'U').charAt(0).toUpperCase()}
												</div>
											{/if}
											<div>
												<p class="font-medium text-gray-900">
													{member.user?.display_name || 'Anonymous'}
												</p>
											</div>
										</div>
									</td>

									<!-- Role -->
									<td class="px-6 py-4">
										{#if isEditing}
											<!-- Role selector -->
											<form method="POST" action="?/updateRole" use:enhance class="flex gap-2">
												<input type="hidden" name="memberId" value={member.id} />
												<select
													name="newRole"
													class="block w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
													required
												>
													{#each assignableRoles as role}
														<option value={role} selected={role === memberRole}>
															{ROLE_DISPLAY_NAMES[role]}
														</option>
													{/each}
												</select>
												<button
													type="submit"
													class="px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500"
												>
													Save
												</button>
												<button
													type="button"
													onclick={() => (editingMemberId = null)}
													class="px-3 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200"
												>
													Cancel
												</button>
											</form>
										{:else}
											<div>
												<p class="text-sm font-medium text-gray-900">
													{ROLE_DISPLAY_NAMES[memberRole]}
												</p>
												<p class="text-xs text-gray-500 mt-1">
													{ROLE_DESCRIPTIONS[memberRole]}
												</p>
											</div>
										{/if}
									</td>

									<!-- Joined Date -->
									<td class="px-6 py-4 text-sm text-gray-600">
										{formatDate(member.joined_at)}
									</td>

									<!-- Actions -->
									<td class="px-6 py-4 text-right">
										{#if canModify && !isEditing}
											<div class="flex justify-end gap-2">
												<!-- Edit Role Button -->
												<button
													onclick={() => (editingMemberId = member.id)}
													class="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 font-medium"
													disabled={isLastOrganizer(memberRole)}
													title={isLastOrganizer(memberRole)
														? 'Cannot modify the last organizer'
														: 'Change role'}
												>
													Change Role
												</button>

												<!-- Remove Member Button -->
												{#if isConfirmingRemove}
													<form
														method="POST"
														action="?/removeMember"
														use:enhance
														class="flex gap-2"
													>
														<input type="hidden" name="memberId" value={member.id} />
														<button
															type="submit"
															class="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 font-medium"
														>
															Confirm
														</button>
														<button
															type="button"
															onclick={() => (confirmRemoveMemberId = null)}
															class="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
														>
															Cancel
														</button>
													</form>
												{:else}
													<button
														onclick={() => (confirmRemoveMemberId = member.id)}
														class="px-3 py-1 text-sm text-red-600 hover:text-red-800 font-medium"
														disabled={isLastOrganizer(memberRole)}
														title={isLastOrganizer(memberRole)
															? 'Cannot remove the last organizer'
															: 'Remove member'}
													>
														Remove
													</button>
												{/if}
											</div>
										{:else if isLastOrganizer(memberRole)}
											<span class="text-xs text-gray-400">Last organizer</span>
										{:else if !canModify}
											<span class="text-xs text-gray-400">No permissions</span>
										{/if}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>

				{#if filteredMembers.length === 0}
					<div class="text-center py-12">
						<p class="text-gray-500">
							{#if searchQuery || roleFilter !== 'all'}
								No members match your search criteria
							{:else}
								No members found
							{/if}
						</p>
					</div>
				{/if}
			</div>

			<!-- Role Hierarchy Info -->
			<div class="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
				<h2 class="text-lg font-semibold text-blue-900 mb-4">Role Permissions</h2>
				<div class="space-y-3">
					{#each ['organizer', 'co_organizer', 'assistant_organizer', 'event_organizer', 'member'] as role}
						{@const typedRole = role as GroupMemberRole}
						<div>
							<p class="font-medium text-blue-900">{ROLE_DISPLAY_NAMES[typedRole]}</p>
							<p class="text-sm text-blue-700">{ROLE_DESCRIPTIONS[typedRole]}</p>
						</div>
					{/each}
				</div>
				<div class="mt-4 pt-4 border-t border-blue-200">
					<p class="text-sm text-blue-700">
						<strong>Your role:</strong>
						{ROLE_DISPLAY_NAMES[currentUserRole]}
					</p>
					<p class="text-sm text-blue-700 mt-1">
						You can assign roles up to and including your own level, and modify members with roles
						below yours.
					</p>
				</div>
			</div>
		</div>
	</div>
</BaseLayout>
