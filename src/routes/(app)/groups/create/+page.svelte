<script lang="ts">
	import { superForm } from 'sveltekit-superforms';
	import type { PageData } from './$types';
	import BaseLayout from '$lib/components/BaseLayout.svelte';
	import CoverImageUpload from '$lib/components/CoverImageUpload.svelte';

	let { data }: { data: PageData } = $props();

	// Initialize superForm with reactive data reference
	const superformResult = $derived.by(() => {
		return superForm(data.form, {
			resetForm: false
		});
	});

	const form = $derived(superformResult.form);
	const errors = $derived(superformResult.errors);
	const enhance = $derived(superformResult.enhance);
	const delayed = $derived(superformResult.delayed);

	// Wizard state
	let currentStep = $state(1);
	const totalSteps = 3;

	// Group topics by category for organized display - use $derived.by for reactive computation
	const groupedTopics = $derived.by(() => {
		return data.topics.reduce((acc: Record<string, Array<{ id: string; name: string }>>, topic) => {
			const category = topic.category || 'Other';
			if (!acc[category]) {
				acc[category] = [];
			}
			acc[category].push({ id: topic.id, name: topic.name });
			return acc;
		}, {});
	});

	// Track selected topics - initialize with empty array and type assertion
	let selectedTopics: string[] = $state(Array.isArray($form.topic_ids) ? $form.topic_ids : []);

	// Update form when selectedTopics changes
	$effect(() => {
		$form.topic_ids = selectedTopics;
	});

	/**
	 * Handle cover image change
	 */
	function handleCoverImageChange(imageDataUrl: string) {
		$form.cover_image_url = imageDataUrl;
	}

	/**
	 * Toggle topic selection
	 */
	function toggleTopic(topicId: string) {
		if (selectedTopics.includes(topicId)) {
			selectedTopics = selectedTopics.filter((id) => id !== topicId);
		} else {
			if (selectedTopics.length < 5) {
				selectedTopics = [...selectedTopics, topicId];
			}
		}
	}

	/**
	 * Validate current step before proceeding
	 */
	function canProceedToNextStep(): boolean {
		if (currentStep === 1) {
			// Step 1: Name is required (with type assertion)
			const name = String($form.name || '');
			return name.trim().length >= 3;
		} else if (currentStep === 2) {
			// Step 2: At least one topic required
			return selectedTopics.length >= 1;
		}
		return true;
	}

	/**
	 * Navigate to next step
	 */
	function nextStep() {
		if (canProceedToNextStep() && currentStep < totalSteps) {
			currentStep++;
		}
	}

	/**
	 * Navigate to previous step
	 */
	function previousStep() {
		if (currentStep > 1) {
			currentStep--;
		}
	}
</script>

<svelte:head>
	<title>Create Group - LetsHang</title>
</svelte:head>

<BaseLayout>
	<div class="min-h-screen bg-gray-50 py-8 px-4">
		<div class="max-w-3xl mx-auto">
			<!-- Header -->
			<div class="mb-8">
				<h1 class="text-3xl font-bold text-gray-900 mb-2">Create a Group</h1>
				<p class="text-gray-600">
					Build a community around your interests. Follow the steps to set up your group.
				</p>
			</div>

			<!-- Progress Indicator -->
			<div class="mb-8">
				<div class="flex items-center justify-between">
					{#each Array(totalSteps) as _, index}
						{@const stepNumber = index + 1}
						{@const isCompleted = stepNumber < currentStep}
						{@const isCurrent = stepNumber === currentStep}

						<div class="flex items-center flex-1">
							<!-- Step Circle -->
							<div
								class="relative flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors"
								class:bg-blue-600={isCurrent || isCompleted}
								class:border-blue-600={isCurrent || isCompleted}
								class:text-white={isCurrent || isCompleted}
								class:bg-white={!isCurrent && !isCompleted}
								class:border-gray-300={!isCurrent && !isCompleted}
								class:text-gray-500={!isCurrent && !isCompleted}
							>
								{#if isCompleted}
									<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
										<path
											fill-rule="evenodd"
											d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
											clip-rule="evenodd"
										/>
									</svg>
								{:else}
									<span class="text-sm font-semibold">{stepNumber}</span>
								{/if}
							</div>

							<!-- Connecting Line (not for last step) -->
							{#if stepNumber < totalSteps}
								<div
									class="flex-1 h-0.5 mx-2 transition-colors"
									class:bg-blue-600={isCompleted}
									class:bg-gray-300={!isCompleted}
								></div>
							{/if}
						</div>
					{/each}
				</div>

				<!-- Step Labels -->
				<div class="flex items-center justify-between mt-2">
					<div class="flex-1 text-center">
						<p class="text-sm font-medium" class:text-blue-600={currentStep === 1}>Basics</p>
					</div>
					<div class="flex-1 text-center">
						<p class="text-sm font-medium" class:text-blue-600={currentStep === 2}>Topics</p>
					</div>
					<div class="flex-1 text-center">
						<p class="text-sm font-medium" class:text-blue-600={currentStep === 3}>Settings</p>
					</div>
				</div>
			</div>

			<!-- Form -->
			<form method="POST" use:enhance class="bg-white rounded-lg shadow-sm p-6">
				<!-- Step 1: Basics -->
				{#if currentStep === 1}
					<div class="space-y-6">
						<h2 class="text-xl font-semibold text-gray-900 mb-4">Basic Information</h2>

						<!-- Group Name -->
						<div>
							<label for="name" class="block text-sm font-medium text-gray-700 mb-2">
								Group Name <span class="text-red-500">*</span>
							</label>
							<input
								id="name"
								name="name"
								type="text"
								required
								bind:value={$form.name}
								aria-invalid={$errors.name ? 'true' : undefined}
								aria-describedby={$errors.name ? 'name-error' : undefined}
								class="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
								class:border-red-500={$errors.name}
								placeholder="e.g., Seattle Tech Meetup, Weekend Hikers"
								minlength="3"
								maxlength="100"
							/>
							{#if $errors.name && Array.isArray($errors.name)}
								<p id="name-error" class="mt-2 text-sm text-red-600" role="alert">
									{$errors.name[0] ?? ''}
								</p>
							{/if}
							<p class="mt-1 text-xs text-gray-500">3-100 characters</p>
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
								placeholder="What is your group about? What kind of events will you host?"
								rows="6"
								maxlength="2000"
							></textarea>
							{#if $errors.description && Array.isArray($errors.description)}
								<p id="description-error" class="mt-2 text-sm text-red-600" role="alert">
									{$errors.description[0] ?? ''}
								</p>
							{/if}
							<p class="mt-1 text-xs text-gray-500">
								{($form.description as string | undefined)?.length || 0}/2000 characters
							</p>
						</div>

						<!-- Cover Photo -->
						<div>
							<p class="block text-sm font-medium text-gray-700 mb-2">Cover Image</p>
							<CoverImageUpload
								currentImageUrl={$form.cover_image_url as string | undefined}
								onImageChange={handleCoverImageChange}
								disabled={$delayed}
							/>
							{#if $errors.cover_image_url && Array.isArray($errors.cover_image_url)}
								<p class="mt-2 text-sm text-red-600" role="alert">
									{$errors.cover_image_url[0] ?? ''}
								</p>
							{/if}
						</div>

						<!-- Hidden input to store cover image URL in form -->
						<input type="hidden" name="cover_image_url" bind:value={$form.cover_image_url} />
					</div>
				{/if}

				<!-- Step 2: Topics -->
				{#if currentStep === 2}
					<div class="space-y-6">
						<div>
							<h2 class="text-xl font-semibold text-gray-900 mb-2">Select Topics</h2>
							<p class="text-gray-600 text-sm mb-4">
								Choose 1-5 topics that best describe your group. This helps members discover your
								group.
							</p>
						</div>

						{#if selectedTopics.length > 0}
							<div class="bg-blue-50 border border-blue-200 rounded-lg p-3">
								<p class="text-sm text-blue-800">
									{selectedTopics.length} topic{selectedTopics.length !== 1 ? 's' : ''} selected
									{selectedTopics.length >= 5 ? '(maximum reached)' : ''}
								</p>
							</div>
						{/if}

						<div class="space-y-6">
							{#each Object.entries(groupedTopics) as [category, topics]}
								<div>
									<h3 class="text-sm font-semibold text-gray-700 mb-3">{category}</h3>
									<div class="grid grid-cols-2 md:grid-cols-3 gap-3">
										{#each topics as topic}
											{@const isSelected = selectedTopics.includes(topic.id)}
											<button
												type="button"
												onclick={() => toggleTopic(topic.id)}
												disabled={!isSelected && selectedTopics.length >= 5}
												class="px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
												class:bg-blue-600={isSelected}
												class:border-blue-600={isSelected}
												class:text-white={isSelected}
												class:bg-white={!isSelected}
												class:border-gray-300={!isSelected}
												class:text-gray-700={!isSelected}
												class:hover:border-blue-400={!isSelected && selectedTopics.length < 5}
												class:opacity-50={!isSelected && selectedTopics.length >= 5}
												class:cursor-not-allowed={!isSelected && selectedTopics.length >= 5}
												aria-pressed={isSelected}
											>
												{topic.name}
											</button>
										{/each}
									</div>
								</div>
							{/each}
						</div>

						{#if $errors.topic_ids && Array.isArray($errors.topic_ids)}
							<div class="bg-red-50 border border-red-200 rounded-lg p-3">
								<p class="text-sm text-red-700" role="alert">
									{$errors.topic_ids[0] ?? ''}
								</p>
							</div>
						{/if}

						<!-- Hidden field for topic_ids -->
						<input type="hidden" name="topic_ids" value={JSON.stringify(selectedTopics)} />
					</div>
				{/if}

				<!-- Step 3: Settings -->
				{#if currentStep === 3}
					<div class="space-y-6">
						<h2 class="text-xl font-semibold text-gray-900 mb-4">Group Settings</h2>

						<!-- Group Type -->
						<div>
							<fieldset>
								<legend class="block text-sm font-medium text-gray-700 mb-3">
									Group Type <span class="text-red-500">*</span>
								</legend>
								<div class="space-y-3">
									<label
										class="flex items-start p-4 border-2 border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition"
										class:bg-blue-50={$form.group_type === 'public'}
										class:border-blue-500={$form.group_type === 'public'}
									>
										<input
											type="radio"
											name="group_type"
											value="public"
											bind:group={$form.group_type}
											class="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500"
											required
										/>
										<span class="ml-3 flex-1">
											<span class="block font-medium text-gray-900">Public</span>
											<span class="block text-sm text-gray-600"
												>Anyone can join immediately. Group is visible in search.</span
											>
										</span>
									</label>

									<label
										class="flex items-start p-4 border-2 border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition"
										class:bg-blue-50={$form.group_type === 'private'}
										class:border-blue-500={$form.group_type === 'private'}
									>
										<input
											type="radio"
											name="group_type"
											value="private"
											bind:group={$form.group_type}
											class="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500"
											required
										/>
										<span class="ml-3 flex-1">
											<span class="block font-medium text-gray-900">Private</span>
											<span class="block text-sm text-gray-600"
												>Members must request to join and be approved by organizers.</span
											>
										</span>
									</label>
								</div>
								{#if $errors.group_type && Array.isArray($errors.group_type)}
									<p class="mt-2 text-sm text-red-600" role="alert">
										{$errors.group_type[0] ?? ''}
									</p>
								{/if}
							</fieldset>
						</div>

						<!-- Location -->
						<div>
							<label for="location" class="block text-sm font-medium text-gray-700 mb-2">
								Location (Optional)
							</label>
							<div class="relative">
								<input
									id="location"
									name="location"
									type="text"
									bind:value={$form.location}
									aria-invalid={$errors.location ? 'true' : undefined}
									aria-describedby={$errors.location ? 'location-error' : undefined}
									class="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
									class:border-red-500={$errors.location}
									class:pr-20={$form.location && ($form.location as string).length > 0}
									placeholder="e.g., San Francisco, CA"
								/>
								{#if $form.location && ($form.location as string).length > 0}
									<button
										type="button"
										onclick={() => ($form.location = '')}
										class="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
										aria-label="Clear location"
									>
										Clear
									</button>
								{/if}
							</div>
							{#if $errors.location && Array.isArray($errors.location)}
								<p id="location-error" class="mt-2 text-sm text-red-600" role="alert">
									{$errors.location[0] ?? ''}
								</p>
							{/if}
							<p class="mt-1 text-xs text-gray-500">
								Help members find your group by adding your city or area.
							</p>
						</div>
					</div>
				{/if}

				<!-- General form errors -->
				{#if $errors._errors && Array.isArray($errors._errors)}
					<div class="mt-6 rounded-lg bg-red-50 p-4" role="alert">
						<p class="text-sm text-red-800">{$errors._errors[0] ?? ''}</p>
					</div>
				{/if}

				<!-- Navigation Actions -->
				<div class="flex items-center justify-between gap-4 pt-6 mt-6 border-t border-gray-200">
					<div>
						{#if currentStep > 1}
							<button
								type="button"
								onclick={previousStep}
								class="px-6 py-3 text-sm font-medium text-gray-700 hover:text-gray-900 transition"
							>
								← Back
							</button>
						{:else}
							<a
								href="/dashboard"
								class="px-6 py-3 text-sm font-medium text-gray-700 hover:text-gray-900 transition"
							>
								Cancel
							</a>
						{/if}
					</div>

					<div>
						{#if currentStep < totalSteps}
							<button
								type="button"
								onclick={nextStep}
								disabled={!canProceedToNextStep()}
								class="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
							>
								Next Step →
							</button>
						{:else}
							<button
								type="submit"
								disabled={$delayed}
								class="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{#if $delayed}
									<span>Creating Group...</span>
								{:else}
									<span>Create Group</span>
								{/if}
							</button>
						{/if}
					</div>
				</div>
			</form>
		</div>
	</div>
</BaseLayout>
