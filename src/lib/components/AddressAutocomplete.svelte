<script lang="ts">
	/* eslint-disable no-undef */
	import { onMount, onDestroy } from 'svelte';
	import { env } from '$env/dynamic/public';

	// Props
	export let value: string = '';
	export let placeholder: string = 'Search for an address...';
	export let required: boolean = false;
	export let id: string = 'address-autocomplete';
	export let name: string = 'address';
	export let hasError: boolean = false;
	export let ariaDescribedBy: string | undefined = undefined;

	// Callback when user selects an address
	export let onSelect: (result: {
		address: string;
		lat: number;
		lng: number;
		placeName: string;
	}) => void = () => {};

	let geocoderContainer: HTMLDivElement;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let geocoder: any | null = null;
	let input: HTMLInputElement | null = null;

	onMount(async () => {
		// Dynamically import to avoid SSR issues
		const MapboxGeocoder = (await import('@mapbox/mapbox-gl-geocoder')).default;
		// Import CSS
		await import('mapbox-gl/dist/mapbox-gl.css');
		await import('@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css');

		geocoder = new MapboxGeocoder({
			accessToken: env.PUBLIC_MAPBOX_ACCESS_TOKEN || '',
			types: 'address,poi', // Address and points of interest
			placeholder: placeholder,
			countries: 'us,ca', // US and Canada for now (can be expanded)
			marker: false, // Don't add a marker
			flyTo: false, // Don't fly to location
			clearAndBlurOnEsc: true,
			enableEventLogging: false // Disable telemetry
		});

		geocoder.addTo(geocoderContainer);

		// Get the geocoder's input element
		const geocoderInput = geocoderContainer.querySelector('input');
		if (geocoderInput) {
			input = geocoderInput;
			input.id = id;
			input.name = name;
			input.required = required;
			input.setAttribute('aria-invalid', hasError ? 'true' : 'false');
			if (ariaDescribedBy) {
				input.setAttribute('aria-describedby', ariaDescribedBy);
			}

			// Set initial value if provided
			if (value) {
				input.value = value;
			}
		}

		// Handle selection
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		geocoder.on('result', (e: any) => {
			const result = e.result;
			const [lng, lat] = result.center;
			const address = result.place_name;

			// Update bound value
			value = address;

			// Call callback with coordinates
			onSelect({
				address,
				lat,
				lng,
				placeName: result.text
			});
		});

		// Handle clear
		geocoder.on('clear', () => {
			value = '';
			onSelect({
				address: '',
				lat: 0,
				lng: 0,
				placeName: ''
			});
		});
	});

	onDestroy(() => {
		if (geocoder) {
			geocoder.onRemove();
		}
	});

	// Update error state reactively
	$: if (input) {
		input.setAttribute('aria-invalid', hasError ? 'true' : 'false');
	}
</script>

<div
	bind:this={geocoderContainer}
	class="mapbox-geocoder-container"
	class:has-error={hasError}
></div>

<style>
	:global(.mapbox-geocoder-container) {
		width: 100%;
	}

	:global(.mapbox-geocoder-container .mapboxgl-ctrl-geocoder) {
		width: 100%;
		max-width: 100%;
		box-shadow: none;
		border: 1px solid rgb(209, 213, 219); /* gray-300 */
		border-radius: 0.5rem; /* rounded-lg */
		font-size: 1rem;
	}

	:global(.mapbox-geocoder-container.has-error .mapboxgl-ctrl-geocoder) {
		border-color: rgb(239, 68, 68); /* red-500 */
	}

	:global(.mapbox-geocoder-container .mapboxgl-ctrl-geocoder input) {
		padding: 0.75rem 1rem; /* py-3 px-4 */
		font-size: 1rem;
		height: auto;
		border: none;
	}

	:global(.mapbox-geocoder-container .mapboxgl-ctrl-geocoder input:focus) {
		outline: none;
	}

	:global(.mapbox-geocoder-container .mapboxgl-ctrl-geocoder--button) {
		display: none;
	}

	:global(.mapbox-geocoder-container .mapboxgl-ctrl-geocoder--icon-search) {
		top: 50%;
		transform: translateY(-50%);
		fill: rgb(107, 114, 128); /* gray-500 */
		width: 20px;
		height: 20px;
		left: 12px;
	}

	:global(.mapbox-geocoder-container .mapboxgl-ctrl-geocoder--icon-loading) {
		top: 50%;
		transform: translateY(-50%);
		right: 12px;
	}

	:global(.mapbox-geocoder-container .mapboxgl-ctrl-geocoder--powered-by) {
		display: none;
	}

	:global(.mapbox-geocoder-container .suggestions) {
		border-radius: 0.5rem;
		box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
		margin-top: 4px;
		border: 1px solid rgb(229, 231, 235); /* gray-200 */
	}

	:global(.mapbox-geocoder-container .suggestions .active) {
		background-color: rgb(239, 246, 255); /* blue-50 */
	}

	:global(.mapbox-geocoder-container .mapboxgl-ctrl-geocoder--suggestion) {
		padding: 0.75rem 1rem;
	}

	:global(.mapbox-geocoder-container .mapboxgl-ctrl-geocoder--suggestion-title) {
		font-weight: 500;
		color: rgb(17, 24, 39); /* gray-900 */
	}

	:global(.mapbox-geocoder-container .mapboxgl-ctrl-geocoder--suggestion-address) {
		color: rgb(107, 114, 128); /* gray-500 */
	}
</style>
