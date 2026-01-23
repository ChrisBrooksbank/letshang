<script lang="ts">
	/* eslint-disable no-undef */
	// Browser APIs like File, HTMLInputElement, Event are not defined in Node.js
	// but will be available at runtime in the browser
	import Cropper from 'svelte-easy-crop';
	import {
		validateImageFile,
		compressImage,
		createImagePreviewUrl,
		getCroppedImage,
		ACCEPTED_IMAGE_TYPES,
		MAX_IMAGE_SIZE_MB
	} from '$lib/utils/image-compression';

	interface Props {
		currentPhotoUrl?: string;
		onPhotoChange: (photoDataUrl: string) => void;
		disabled?: boolean;
	}

	let { currentPhotoUrl = '', onPhotoChange, disabled = false }: Props = $props();

	let fileInput: HTMLInputElement;
	let selectedFile: File | null = $state(null);
	let previewUrl: string = $state('');
	let showCropper: boolean = $state(false);
	let cropperImage: string = $state('');
	let error: string = $state('');
	let isProcessing: boolean = $state(false);

	// Cropper state
	let crop = $state({ x: 0, y: 0 });
	let zoom = $state(1);
	let croppedAreaPixels: { x: number; y: number; width: number; height: number } | null =
		$state(null);

	/**
	 * Handle file input change
	 */
	async function handleFileSelect(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];

		if (!file) return;

		error = '';

		// Validate file
		const validation = validateImageFile(file);
		if (!validation.isValid) {
			error = validation.error || 'Invalid file';
			return;
		}

		selectedFile = file;

		// Create preview URL for cropper
		try {
			cropperImage = await createImagePreviewUrl(file);
			showCropper = true;
		} catch (err) {
			error = 'Failed to load image';
			// eslint-disable-next-line no-console
			console.error('Error creating preview:', err);
		}
	}

	/**
	 * Handle crop complete from the cropper
	 */
	function handleCropComplete(event: {
		percent: { x: number; y: number; width: number; height: number };
		pixels: { x: number; y: number; width: number; height: number };
	}) {
		croppedAreaPixels = event.pixels;
	}

	/**
	 * Save the cropped image
	 */
	async function saveCroppedImage() {
		if (!cropperImage || !croppedAreaPixels) return;

		isProcessing = true;
		error = '';

		try {
			// Get cropped image as blob
			const croppedBlob = await getCroppedImage(cropperImage, croppedAreaPixels);

			// Convert blob to file for compression
			const croppedFile = new File([croppedBlob], 'profile-photo.webp', { type: 'image/webp' });

			// Compress the cropped image
			const compressedBlob = await compressImage(croppedFile);

			// Create preview URL
			const dataUrl = await createImagePreviewUrl(compressedBlob);
			previewUrl = dataUrl;

			// Notify parent component
			onPhotoChange(dataUrl);

			// Close cropper
			showCropper = false;
			selectedFile = null;
		} catch (err) {
			error = 'Failed to process image';
			// eslint-disable-next-line no-console
			console.error('Error processing image:', err);
		} finally {
			isProcessing = false;
		}
	}

	/**
	 * Cancel cropping
	 */
	function cancelCrop() {
		showCropper = false;
		selectedFile = null;
		cropperImage = '';
		if (fileInput) {
			fileInput.value = '';
		}
	}

	/**
	 * Trigger file input click
	 */
	function selectPhoto() {
		fileInput?.click();
	}

	/**
	 * Remove photo
	 */
	function removePhoto() {
		previewUrl = '';
		selectedFile = null;
		onPhotoChange('');
		if (fileInput) {
			fileInput.value = '';
		}
	}

	// Update preview when currentPhotoUrl changes
	$effect(() => {
		if (currentPhotoUrl && !selectedFile) {
			previewUrl = currentPhotoUrl;
		}
	});
</script>

<div class="space-y-4">
	<!-- Photo Preview -->
	<div class="flex items-center gap-4">
		<div class="relative">
			{#if previewUrl}
				<img
					src={previewUrl}
					alt="Profile"
					class="h-24 w-24 rounded-full object-cover border-2 border-gray-200"
				/>
			{:else}
				<div
					class="h-24 w-24 rounded-full bg-gray-200 flex items-center justify-center border-2 border-gray-300"
				>
					<svg
						class="h-12 w-12 text-gray-400"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
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
		</div>

		<div class="flex-1">
			<input
				bind:this={fileInput}
				type="file"
				accept={ACCEPTED_IMAGE_TYPES.join(',')}
				onchange={handleFileSelect}
				class="hidden"
				aria-label="Upload profile photo"
			/>

			<div class="flex gap-2">
				<button
					type="button"
					onclick={selectPhoto}
					disabled={disabled || isProcessing}
					class="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-sm font-medium transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
				>
					{previewUrl ? 'Change Photo' : 'Upload Photo'}
				</button>

				{#if previewUrl}
					<button
						type="button"
						onclick={removePhoto}
						disabled={disabled || isProcessing}
						class="px-4 py-2 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 text-gray-800 rounded-lg text-sm font-medium transition-colors focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
					>
						Remove
					</button>
				{/if}
			</div>

			<p class="text-xs text-gray-500 mt-2">
				JPG, PNG, or WebP. Max {MAX_IMAGE_SIZE_MB}MB. Square crop required.
			</p>
		</div>
	</div>

	<!-- Error Message -->
	{#if error}
		<div class="bg-red-50 border border-red-200 rounded-lg p-3">
			<p class="text-red-700 text-sm">{error}</p>
		</div>
	{/if}

	<!-- Cropper Modal -->
	{#if showCropper}
		<div
			class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
			role="dialog"
			aria-modal="true"
			aria-labelledby="cropper-title"
		>
			<div class="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col">
				<!-- Header -->
				<div class="p-4 border-b">
					<h2 id="cropper-title" class="text-lg font-semibold">Crop Profile Photo</h2>
					<p class="text-sm text-gray-600 mt-1">Drag to reposition, scroll to zoom</p>
				</div>

				<!-- Cropper Area -->
				<div class="relative flex-1 bg-gray-900 min-h-[400px]">
					<Cropper
						image={cropperImage}
						bind:crop
						bind:zoom
						aspect={1}
						cropShape="round"
						showGrid={false}
						oncropcomplete={handleCropComplete}
					/>
				</div>

				<!-- Zoom Slider -->
				<div class="p-4 border-t border-b">
					<label for="zoom-slider" class="block text-sm font-medium mb-2"> Zoom </label>
					<input
						id="zoom-slider"
						type="range"
						min="1"
						max="3"
						step="0.1"
						bind:value={zoom}
						class="w-full"
						aria-label="Zoom level"
					/>
				</div>

				<!-- Actions -->
				<div class="p-4 flex gap-3 justify-end">
					<button
						type="button"
						onclick={cancelCrop}
						disabled={isProcessing}
						class="px-4 py-2 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 text-gray-800 rounded-lg font-medium transition-colors focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
					>
						Cancel
					</button>
					<button
						type="button"
						onclick={saveCroppedImage}
						disabled={isProcessing}
						class="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
					>
						{#if isProcessing}
							Processing...
						{:else}
							Save
						{/if}
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>
