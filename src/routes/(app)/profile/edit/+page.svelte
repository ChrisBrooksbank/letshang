<script lang="ts">
	import { superForm } from 'sveltekit-superforms';
	import { zodClient } from 'sveltekit-superforms/adapters';
	import { profileUpdateSchema } from '$lib/schemas/profile';
	import type { PageData } from './$types';

	export let data: PageData;

	const { form, errors, enhance, delayed } = superForm(data.form, {
		// @ts-expect-error - Known Zod/Superforms type incompatibility with optional fields
		validators: zodClient(profileUpdateSchema),
		dataType: 'json'
	});
</script>

<div class="container mx-auto max-w-2xl p-4">
	<div class="mb-6">
		<h1 class="text-2xl font-bold">Edit Profile</h1>
		<p class="text-gray-600 text-sm mt-1">Update your display name, bio, and location</p>
	</div>

	<form method="POST" use:enhance class="space-y-6">
		<!-- Display Name -->
		<div>
			<label for="displayName" class="block text-sm font-medium mb-2">
				Display Name <span class="text-red-500">*</span>
			</label>
			<input
				id="displayName"
				name="displayName"
				type="text"
				bind:value={$form.displayName}
				aria-invalid={$errors.displayName ? 'true' : undefined}
				class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
				class:border-red-500={$errors.displayName}
				placeholder="Enter your display name"
				maxlength="50"
				required
			/>
			{#if $errors.displayName}
				<p class="text-red-500 text-sm mt-1">{$errors.displayName}</p>
			{/if}
			<p class="text-gray-500 text-xs mt-1">2-50 characters</p>
		</div>

		<!-- Bio -->
		<div>
			<label for="bio" class="block text-sm font-medium mb-2"> Bio </label>
			<textarea
				id="bio"
				name="bio"
				bind:value={$form.bio}
				aria-invalid={$errors.bio ? 'true' : undefined}
				class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
				class:border-red-500={$errors.bio}
				placeholder="Tell us a bit about yourself"
				rows="4"
				maxlength="500"
			></textarea>
			{#if $errors.bio}
				<p class="text-red-500 text-sm mt-1">{$errors.bio}</p>
			{/if}
			<p class="text-gray-500 text-xs mt-1">
				{($form.bio as string | undefined)?.length || 0}/500 characters
			</p>
		</div>

		<!-- Location -->
		<div>
			<label for="location" class="block text-sm font-medium mb-2"> Location </label>
			<input
				id="location"
				name="location"
				type="text"
				bind:value={$form.location}
				aria-invalid={$errors.location ? 'true' : undefined}
				class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
				class:border-red-500={$errors.location}
				placeholder="e.g., San Francisco, CA"
			/>
			{#if $errors.location}
				<p class="text-red-500 text-sm mt-1">{$errors.location}</p>
			{/if}
			<p class="text-gray-500 text-xs mt-1">
				Your location helps us recommend nearby events and groups
			</p>
		</div>

		<!-- Form-level errors -->
		{#if $errors._errors}
			<div class="bg-red-50 border border-red-200 rounded-lg p-4">
				<p class="text-red-700 text-sm">{$errors._errors}</p>
			</div>
		{/if}

		<!-- Action buttons -->
		<div class="flex gap-4 pt-4">
			<button
				type="submit"
				disabled={$delayed}
				class="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 px-6 rounded-lg transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
			>
				{#if $delayed}
					Saving...
				{:else}
					Save Changes
				{/if}
			</button>
			<a
				href="/profile"
				class="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-3 px-6 rounded-lg text-center transition-colors focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
			>
				Cancel
			</a>
		</div>
	</form>
</div>
