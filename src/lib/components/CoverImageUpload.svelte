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
	import {
		STOCK_IMAGE_CATEGORIES,
		getImagesByCategory,
		type StockImageCategory
	} from '$lib/data/stock-images';

	interface Props {
		currentImageUrl?: string;
		onImageChange: (imageDataUrl: string) => void;
		disabled?: boolean;
	}

	let { currentImageUrl = '', onImageChange, disabled = false }: Props = $props();

	let fileInput: HTMLInputElement;
	let selectedFile: File | null = $state(null);
	let previewUrl: string = $state('');
	let showCropper: boolean = $state(false);
	let cropperImage: string = $state('');
	let error: string = $state('');
	let isProcessing: boolean = $state(false);

	// Gallery state
	let showGallery: boolean = $state(false);
	let selectedCategory: StockImageCategory = $state('Social');

	// Cropper state (16:9 aspect ratio for cover images)
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
			const croppedFile = new File([croppedBlob], 'cover-image.webp', { type: 'image/webp' });

			// Compress the cropped image
			const compressedBlob = await compressImage(croppedFile);

			// Create preview URL
			const dataUrl = await createImagePreviewUrl(compressedBlob);
			previewUrl = dataUrl;

			// Notify parent component
			onImageChange(dataUrl);

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
	function selectImage() {
		fileInput?.click();
	}

	/**
	 * Remove image
	 */
	function removeImage() {
		previewUrl = '';
		selectedFile = null;
		onImageChange('');
		if (fileInput) {
			fileInput.value = '';
		}
	}

	/**
	 * Select a stock image from the gallery
	 */
	function selectStockImage(imageUrl: string) {
		previewUrl = imageUrl;
		onImageChange(imageUrl);
		showGallery = false;
	}

	/**
	 * Open gallery modal
	 */
	function openGallery() {
		showGallery = true;
	}

	/**
	 * Close gallery modal
	 */
	function closeGallery() {
		showGallery = false;
	}

	// Update preview when currentImageUrl changes
	$effect(() => {
		if (currentImageUrl && !selectedFile) {
			previewUrl = currentImageUrl;
		}
	});
</script>

<div class="space-y-4">
	<!-- Image Preview -->
	<div class="space-y-3">
		<div class="relative w-full">
			{#if previewUrl}
				<img
					src={previewUrl}
					alt="Cover"
					class="w-full h-48 object-cover rounded-lg border-2 border-gray-200"
				/>
			{:else}
				<div
					class="w-full h-48 rounded-lg bg-gray-100 flex items-center justify-center border-2 border-dashed border-gray-300"
				>
					<div class="text-center">
						<svg
							class="mx-auto h-12 w-12 text-gray-400"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
							/>
						</svg>
						<p class="mt-2 text-sm text-gray-500">Select from gallery or upload your own</p>
					</div>
				</div>
			{/if}
		</div>

		<div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
			<input
				bind:this={fileInput}
				type="file"
				accept={ACCEPTED_IMAGE_TYPES.join(',')}
				onchange={handleFileSelect}
				class="hidden"
				aria-label="Upload cover image"
			/>

			<button
				type="button"
				onclick={openGallery}
				disabled={disabled || isProcessing}
				class="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg text-sm font-medium transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 min-h-[44px]"
			>
				Browse Gallery
			</button>

			<button
				type="button"
				onclick={selectImage}
				disabled={disabled || isProcessing}
				class="px-4 py-2 bg-white border-2 border-blue-600 hover:bg-blue-50 disabled:bg-gray-100 disabled:border-gray-300 text-blue-600 disabled:text-gray-400 rounded-lg text-sm font-medium transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 min-h-[44px]"
			>
				{previewUrl ? 'Upload Different Image' : 'Upload Custom Image'}
			</button>

			{#if previewUrl}
				<button
					type="button"
					onclick={removeImage}
					disabled={disabled || isProcessing}
					class="px-4 py-2 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 text-gray-800 rounded-lg text-sm font-medium transition-colors focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 min-h-[44px]"
				>
					Remove
				</button>
			{/if}
		</div>

		<p class="text-xs text-gray-500">
			Choose from curated gallery or upload your own (JPG, PNG, WebP, max {MAX_IMAGE_SIZE_MB}MB)
		</p>
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
			<div class="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
				<!-- Header -->
				<div class="p-4 border-b">
					<h2 id="cropper-title" class="text-lg font-semibold">Crop Cover Image</h2>
					<p class="text-sm text-gray-600 mt-1">Drag to reposition, scroll to zoom</p>
				</div>

				<!-- Cropper Area -->
				<div class="relative flex-1 bg-gray-900 min-h-[400px]">
					<Cropper
						image={cropperImage}
						bind:crop
						bind:zoom
						aspect={16 / 9}
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

	<!-- Stock Image Gallery Modal -->
	{#if showGallery}
		<div
			class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
			role="dialog"
			aria-modal="true"
			aria-labelledby="gallery-title"
		>
			<div class="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] flex flex-col">
				<!-- Header -->
				<div class="p-4 border-b">
					<div class="flex items-center justify-between">
						<h2 id="gallery-title" class="text-lg font-semibold">Select Cover Image</h2>
						<button
							type="button"
							onclick={closeGallery}
							class="p-2 hover:bg-gray-100 rounded-lg transition-colors"
							aria-label="Close gallery"
						>
							<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
								<path
									fill-rule="evenodd"
									d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
									clip-rule="evenodd"
								/>
							</svg>
						</button>
					</div>
					<p class="text-sm text-gray-600 mt-1">Browse curated images by category</p>
				</div>

				<!-- Category Tabs -->
				<div class="border-b overflow-x-auto">
					<div class="flex gap-2 p-4 min-w-max">
						{#each STOCK_IMAGE_CATEGORIES as category}
							<button
								type="button"
								onclick={() => (selectedCategory = category)}
								class="px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap {selectedCategory ===
								category
									? 'bg-blue-100 text-blue-700'
									: 'bg-white text-gray-700 hover:bg-gray-100'}"
							>
								{category}
							</button>
						{/each}
					</div>
				</div>

				<!-- Image Grid -->
				<div class="flex-1 overflow-y-auto p-4">
					<div class="grid grid-cols-2 md:grid-cols-3 gap-4">
						{#each getImagesByCategory(selectedCategory) as image (image.id)}
							<button
								type="button"
								onclick={() => selectStockImage(image.url)}
								class="relative aspect-video rounded-lg overflow-hidden border-2 border-gray-200 hover:border-blue-500 transition-colors group focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
							>
								<img
									src={image.url}
									alt={image.alt}
									class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
								/>
								<div
									class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity flex items-center justify-center"
								>
									<svg
										class="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M5 13l4 4L19 7"
										/>
									</svg>
								</div>
							</button>
						{/each}
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>
