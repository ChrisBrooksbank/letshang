<script lang="ts">
	import { superForm } from 'sveltekit-superforms';
	import type { PageData } from './$types';
	import BaseLayout from '$lib/components/BaseLayout.svelte';

	export let data: PageData;

	const { form, errors, enhance, delayed } = superForm(data.form, {
		resetForm: false
	});

	// Helper to format datetime-local input format (YYYY-MM-DDTHH:MM)
	function formatDateTimeLocal(date: Date): string {
		const pad = (n: number) => String(n).padStart(2, '0');
		return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
	}

	// Default start time to 1 hour from now, rounded to next 15 minutes
	const now = new Date();
	now.setMinutes(Math.ceil(now.getMinutes() / 15) * 15 + 60, 0, 0);
	const defaultStartTime = formatDateTimeLocal(now);

	// Default duration to 60 minutes
	let durationMinutes = 60;

	// Reactive: Update form data when duration changes
	$: $form.durationMinutes = durationMinutes;
</script>

<svelte:head>
	<title>Create Event - LetsHang</title>
</svelte:head>

<BaseLayout>
	<div class="min-h-screen bg-gray-50 py-8 px-4">
		<div class="max-w-2xl mx-auto">
			<!-- Header -->
			<div class="mb-8">
				<h1 class="text-3xl font-bold text-gray-900 mb-2">Create an Event</h1>
				<p class="text-gray-600">
					Fill in the details below to create your event. Required fields are marked with an
					asterisk (*).
				</p>
			</div>

			<!-- Form -->
			<form method="POST" use:enhance class="bg-white rounded-lg shadow-sm p-6 space-y-6">
				<!-- Group Selector (optional) -->
				{#if data.groups && data.groups.length > 0}
					<div>
						<label for="groupId" class="block text-sm font-medium text-gray-700 mb-2">
							Group (Optional)
						</label>
						<select
							id="groupId"
							name="groupId"
							bind:value={$form.groupId}
							class="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
						>
							<option value="">Standalone Event (No Group)</option>
							{#each data.groups as group}
								<option value={group.id}>{group.name}</option>
							{/each}
						</select>
						<p class="mt-1 text-xs text-gray-500">
							Link this event to a group. Group members will be able to see it.
						</p>
					</div>
				{/if}

				<!-- Event Visibility -->
				<div>
					<fieldset>
						<legend class="block text-sm font-medium text-gray-700 mb-3">
							Event Visibility <span class="text-red-500">*</span>
						</legend>
						<div class="space-y-3">
							<label
								class="flex items-start p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition"
								class:bg-blue-50={$form.visibility === 'public'}
								class:border-blue-500={$form.visibility === 'public'}
							>
								<input
									type="radio"
									name="visibility"
									value="public"
									bind:group={$form.visibility}
									class="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500"
									required
								/>
								<span class="ml-3 flex-1">
									<span class="block font-medium text-gray-900">Public</span>
									<span class="block text-sm text-gray-600"
										>Anyone can discover and view this event</span
									>
								</span>
							</label>

							<label
								class="flex items-start p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition"
								class:bg-blue-50={$form.visibility === 'group_only'}
								class:border-blue-500={$form.visibility === 'group_only'}
								class:opacity-50={!$form.groupId}
								class:cursor-not-allowed={!$form.groupId}
							>
								<input
									type="radio"
									name="visibility"
									value="group_only"
									bind:group={$form.visibility}
									disabled={!$form.groupId}
									class="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500"
									required
								/>
								<span class="ml-3 flex-1">
									<span class="block font-medium text-gray-900">Group Only</span>
									<span class="block text-sm text-gray-600"
										>Only members of the selected group can see this event</span
									>
									{#if !$form.groupId}
										<span class="block text-xs text-yellow-600 mt-1"
											>Select a group above to enable this option</span
										>
									{/if}
								</span>
							</label>

							<label
								class="flex items-start p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition"
								class:bg-blue-50={$form.visibility === 'hidden'}
								class:border-blue-500={$form.visibility === 'hidden'}
							>
								<input
									type="radio"
									name="visibility"
									value="hidden"
									bind:group={$form.visibility}
									class="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500"
									required
								/>
								<span class="ml-3 flex-1">
									<span class="block font-medium text-gray-900">Hidden</span>
									<span class="block text-sm text-gray-600"
										>Event is not discoverable. Share the direct link to invite people.</span
									>
								</span>
							</label>
						</div>
						{#if $errors.visibility && Array.isArray($errors.visibility)}
							<p class="mt-2 text-sm text-red-600" role="alert">
								{$errors.visibility[0] ?? ''}
							</p>
						{/if}
					</fieldset>
				</div>

				<!-- Title -->
				<div>
					<label for="title" class="block text-sm font-medium text-gray-700 mb-2">
						Event Title <span class="text-red-500">*</span>
					</label>
					<input
						id="title"
						name="title"
						type="text"
						required
						bind:value={$form.title}
						aria-invalid={$errors.title ? 'true' : undefined}
						aria-describedby={$errors.title ? 'title-error' : undefined}
						class="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
						class:border-red-500={$errors.title}
						placeholder="Give your event a catchy title"
						minlength="5"
						maxlength="100"
					/>
					{#if $errors.title && Array.isArray($errors.title)}
						<p id="title-error" class="mt-2 text-sm text-red-600" role="alert">
							{$errors.title[0] ?? ''}
						</p>
					{/if}
					<p class="mt-1 text-xs text-gray-500">5-100 characters</p>
				</div>

				<!-- Description -->
				<div>
					<label for="description" class="block text-sm font-medium text-gray-700 mb-2">
						Description
					</label>
					<textarea
						id="description"
						name="description"
						bind:value={$form.description}
						aria-invalid={$errors.description ? 'true' : undefined}
						aria-describedby={$errors.description ? 'description-error' : undefined}
						class="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-vertical"
						class:border-red-500={$errors.description}
						placeholder="Describe your event. What should attendees know?"
						rows="6"
						maxlength="5000"
					></textarea>
					{#if $errors.description && Array.isArray($errors.description)}
						<p id="description-error" class="mt-2 text-sm text-red-600" role="alert">
							{$errors.description[0] ?? ''}
						</p>
					{/if}
					<p class="mt-1 text-xs text-gray-500">Up to 5000 characters</p>
				</div>

				<!-- Event Type -->
				<div>
					<fieldset>
						<legend class="block text-sm font-medium text-gray-700 mb-3">
							Event Type <span class="text-red-500">*</span>
						</legend>
						<div class="space-y-3">
							<label
								class="flex items-start p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition"
								class:bg-blue-50={$form.eventType === 'online'}
								class:border-blue-500={$form.eventType === 'online'}
							>
								<input
									type="radio"
									name="eventType"
									value="online"
									bind:group={$form.eventType}
									class="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500"
									required
								/>
								<span class="ml-3 flex-1">
									<span class="block font-medium text-gray-900">Online</span>
									<span class="block text-sm text-gray-600"
										>Event happens virtually (video call, livestream, etc.)</span
									>
								</span>
							</label>

							<label
								class="flex items-start p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition"
								class:bg-blue-50={$form.eventType === 'in_person'}
								class:border-blue-500={$form.eventType === 'in_person'}
							>
								<input
									type="radio"
									name="eventType"
									value="in-person"
									bind:group={$form.eventType}
									class="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500"
									required
								/>
								<span class="ml-3 flex-1">
									<span class="block font-medium text-gray-900">In-Person</span>
									<span class="block text-sm text-gray-600"
										>Event happens at a physical location</span
									>
								</span>
							</label>

							<label
								class="flex items-start p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition"
								class:bg-blue-50={$form.eventType === 'hybrid'}
								class:border-blue-500={$form.eventType === 'hybrid'}
							>
								<input
									type="radio"
									name="eventType"
									value="hybrid"
									bind:group={$form.eventType}
									class="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500"
									required
								/>
								<span class="ml-3 flex-1">
									<span class="block font-medium text-gray-900">Hybrid</span>
									<span class="block text-sm text-gray-600"
										>Event offers both in-person and online attendance</span
									>
								</span>
							</label>
						</div>
						{#if $errors.eventType && Array.isArray($errors.eventType)}
							<p class="mt-2 text-sm text-red-600" role="alert">
								{$errors.eventType[0] ?? ''}
							</p>
						{/if}
					</fieldset>
				</div>

				<!-- Venue Information (shown for in-person and hybrid) -->
				{#if $form.eventType === 'in_person' || $form.eventType === 'hybrid'}
					<div class="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
						<h3 class="font-medium text-gray-900">Venue Information</h3>

						<!-- Venue Name -->
						<div>
							<label for="venueName" class="block text-sm font-medium text-gray-700 mb-2">
								Venue Name <span class="text-red-500">*</span>
							</label>
							<input
								id="venueName"
								name="venueName"
								type="text"
								required={$form.eventType === 'in_person' || $form.eventType === 'hybrid'}
								bind:value={$form.venueName}
								aria-invalid={$errors.venueName ? 'true' : undefined}
								aria-describedby={$errors.venueName ? 'venueName-error' : undefined}
								class="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
								class:border-red-500={$errors.venueName}
								placeholder="Coffee Shop, Park, Community Center..."
								maxlength="200"
							/>
							{#if $errors.venueName && Array.isArray($errors.venueName)}
								<p id="venueName-error" class="mt-2 text-sm text-red-600" role="alert">
									{$errors.venueName[0] ?? ''}
								</p>
							{/if}
						</div>

						<!-- Venue Address -->
						<div>
							<label for="venueAddress" class="block text-sm font-medium text-gray-700 mb-2">
								Venue Address <span class="text-red-500">*</span>
							</label>
							<input
								id="venueAddress"
								name="venueAddress"
								type="text"
								required={$form.eventType === 'in_person' || $form.eventType === 'hybrid'}
								bind:value={$form.venueAddress}
								aria-invalid={$errors.venueAddress ? 'true' : undefined}
								aria-describedby={$errors.venueAddress ? 'venueAddress-error' : undefined}
								class="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
								class:border-red-500={$errors.venueAddress}
								placeholder="123 Main St, City, State ZIP"
								maxlength="500"
							/>
							{#if $errors.venueAddress && Array.isArray($errors.venueAddress)}
								<p id="venueAddress-error" class="mt-2 text-sm text-red-600" role="alert">
									{$errors.venueAddress[0] ?? ''}
								</p>
							{/if}
						</div>
					</div>
				{/if}

				<!-- Start Date and Time -->
				<div>
					<label for="startTime" class="block text-sm font-medium text-gray-700 mb-2">
						Start Date & Time <span class="text-red-500">*</span>
					</label>
					<input
						id="startTime"
						name="startTime"
						type="datetime-local"
						required
						value={$form.startTime || defaultStartTime}
						on:input={(e) => ($form.startTime = e.currentTarget.value)}
						aria-invalid={$errors.startTime ? 'true' : undefined}
						aria-describedby={$errors.startTime ? 'startTime-error' : undefined}
						class="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
						class:border-red-500={$errors.startTime}
					/>
					{#if $errors.startTime && Array.isArray($errors.startTime)}
						<p id="startTime-error" class="mt-2 text-sm text-red-600" role="alert">
							{$errors.startTime[0] ?? ''}
						</p>
					{/if}
				</div>

				<!-- Duration -->
				<div>
					<label for="durationMinutes" class="block text-sm font-medium text-gray-700 mb-2">
						Duration <span class="text-red-500">*</span>
					</label>
					<select
						id="durationMinutes"
						name="durationMinutes"
						bind:value={durationMinutes}
						class="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
					>
						<option value={15}>15 minutes</option>
						<option value={30}>30 minutes</option>
						<option value={45}>45 minutes</option>
						<option value={60}>1 hour</option>
						<option value={90}>1.5 hours</option>
						<option value={120}>2 hours</option>
						<option value={180}>3 hours</option>
						<option value={240}>4 hours</option>
						<option value={360}>6 hours</option>
						<option value={480}>8 hours</option>
					</select>
					{#if $errors.durationMinutes && Array.isArray($errors.durationMinutes)}
						<p class="mt-2 text-sm text-red-600" role="alert">
							{$errors.durationMinutes[0] ?? ''}
						</p>
					{/if}
				</div>

				<!-- General form errors -->
				{#if $errors._errors && Array.isArray($errors._errors)}
					<div class="rounded-lg bg-red-50 p-4" role="alert">
						<p class="text-sm text-red-800">{$errors._errors[0] ?? ''}</p>
					</div>
				{/if}

				<!-- Actions -->
				<div class="flex items-center justify-end gap-4 pt-4 border-t border-gray-200">
					<a
						href="/dashboard"
						class="px-6 py-3 text-sm font-medium text-gray-700 hover:text-gray-900 transition"
					>
						Cancel
					</a>
					<button
						type="submit"
						disabled={$delayed}
						class="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{#if $delayed}
							<span>Creating Event...</span>
						{:else}
							<span>Create Event</span>
						{/if}
					</button>
				</div>
			</form>
		</div>
	</div>
</BaseLayout>
