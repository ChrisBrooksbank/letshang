<script lang="ts">
	import { getCurrentLocation } from '$lib/utils/location';

	interface Props {
		onLocationChange?: (lat: number, lng: number) => void;
	}

	let { onLocationChange }: Props = $props();

	let isLoading = $state(false);
	let error = $state<string | null>(null);

	async function handleNearMe() {
		isLoading = true;
		error = null;

		try {
			const coords = await getCurrentLocation();

			if (!coords) {
				error = 'Unable to get your location. Please enable location access in your browser.';
				return;
			}

			// Call the callback with the coordinates
			if (onLocationChange) {
				onLocationChange(coords.lat, coords.lng);
			}
		} catch {
			error = 'An error occurred while getting your location';
		} finally {
			isLoading = false;
		}
	}
</script>

<div class="near-me-section">
	<button
		onclick={handleNearMe}
		disabled={isLoading}
		class="near-me-button"
		aria-label="Find events near me using GPS"
	>
		{#if isLoading}
			<svg
				class="animate-spin h-5 w-5 text-white"
				xmlns="http://www.w3.org/2000/svg"
				fill="none"
				viewBox="0 0 24 24"
			>
				<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
				></circle>
				<path
					class="opacity-75"
					fill="currentColor"
					d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
				></path>
			</svg>
			<span>Getting location...</span>
		{:else}
			<svg
				class="h-5 w-5"
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
				></path>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
				></path>
			</svg>
			<span>Near Me</span>
		{/if}
	</button>

	{#if error}
		<div class="error-message" role="alert">
			<svg class="h-5 w-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
				></path>
			</svg>
			<span>{error}</span>
		</div>
	{/if}
</div>

<style>
	.near-me-section {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.near-me-button {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.625rem 1.25rem;
		background-color: #3b82f6;
		color: white;
		font-weight: 500;
		font-size: 0.875rem;
		border-radius: 0.5rem;
		border: none;
		cursor: pointer;
		transition: background-color 0.15s;
	}

	.near-me-button:hover:not(:disabled) {
		background-color: #2563eb;
	}

	.near-me-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.near-me-button:focus {
		outline: 2px solid transparent;
		outline-offset: 2px;
		box-shadow:
			0 0 0 3px rgba(59, 130, 246, 0.5),
			0 0 0 2px #3b82f6;
	}

	.error-message {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		background-color: #fef2f2;
		border: 1px solid #fecaca;
		border-radius: 0.5rem;
		color: #991b1b;
		font-size: 0.875rem;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.animate-spin {
		animation: spin 1s linear infinite;
	}
</style>
