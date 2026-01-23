<script lang="ts">
	import type { PageData } from './$types';

	export let data: PageData;
</script>

<div class="container mx-auto max-w-2xl p-4">
	<div class="flex justify-between items-start mb-6">
		<div>
			<h1 class="text-2xl font-bold">Profile</h1>
			<p class="text-gray-600 text-sm mt-1">{data.email}</p>
		</div>
		<a
			href="/profile/edit"
			class="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
		>
			Edit Profile
		</a>
	</div>

	{#if data.profile}
		<div class="bg-white border rounded-lg p-6 space-y-6">
			<!-- Display Name -->
			<div>
				<h2 class="text-sm font-medium text-gray-500 mb-1">Display Name</h2>
				<p class="text-lg">{data.profile.displayName || 'Not set'}</p>
			</div>

			<!-- Bio -->
			<div>
				<h2 class="text-sm font-medium text-gray-500 mb-1">Bio</h2>
				{#if data.profile.bio}
					<p class="text-gray-800 whitespace-pre-wrap">{data.profile.bio}</p>
				{:else}
					<p class="text-gray-400 italic">No bio added yet</p>
				{/if}
			</div>

			<!-- Location -->
			<div>
				<h2 class="text-sm font-medium text-gray-500 mb-1">Location</h2>
				<p class="text-gray-800">{data.profile.location || 'Not set'}</p>
			</div>

			<!-- Profile Visibility -->
			<div>
				<h2 class="text-sm font-medium text-gray-500 mb-1">Profile Visibility</h2>
				<p class="text-gray-800 capitalize">{data.profile.profileVisibility.replace('_', ' ')}</p>
			</div>

			<!-- Member Since -->
			<div>
				<h2 class="text-sm font-medium text-gray-500 mb-1">Member Since</h2>
				<p class="text-gray-800">
					{new Date(data.profile.createdAt).toLocaleDateString('en-US', {
						year: 'numeric',
						month: 'long',
						day: 'numeric'
					})}
				</p>
			</div>
		</div>
	{:else}
		<div class="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
			<p class="text-yellow-800">
				Your profile hasn't been created yet. Click "Edit Profile" to set up your profile.
			</p>
		</div>
	{/if}
</div>
