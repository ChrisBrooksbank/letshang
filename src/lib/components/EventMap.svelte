<script lang="ts">
	/* eslint-disable no-undef */
	import { onMount, onDestroy } from 'svelte';
	import { env } from '$env/dynamic/public';

	// Props
	export let latitude: number;
	export let longitude: number;
	export let markerLabel: string = '';
	export let height: string = '300px';

	let mapContainer: HTMLDivElement;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let map: any | null = null;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let marker: any | null = null;

	onMount(async () => {
		// Dynamically import to avoid SSR issues
		const mapboxgl = (await import('mapbox-gl')).default;
		// Import CSS
		await import('mapbox-gl/dist/mapbox-gl.css');

		// Set access token
		mapboxgl.accessToken = env.PUBLIC_MAPBOX_ACCESS_TOKEN || '';

		// Initialize map
		map = new mapboxgl.Map({
			container: mapContainer,
			style: 'mapbox://styles/mapbox/streets-v12',
			center: [longitude, latitude],
			zoom: 14,
			attributionControl: true
		});

		// Add navigation controls
		map.addControl(new mapboxgl.NavigationControl(), 'top-right');

		// Add marker
		const el = document.createElement('div');
		el.className = 'custom-marker';
		el.innerHTML = `
			<svg width="32" height="40" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
				<path d="M16 0C7.163 0 0 7.163 0 16C0 28 16 40 16 40C16 40 32 28 32 16C32 7.163 24.837 0 16 0Z" fill="#2563EB"/>
				<circle cx="16" cy="16" r="6" fill="white"/>
			</svg>
		`;

		marker = new mapboxgl.Marker(el).setLngLat([longitude, latitude]);

		// Add popup if label provided
		if (markerLabel) {
			const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(
				`<div style="padding: 8px; font-family: system-ui, -apple-system, sans-serif;">
					<strong>${markerLabel}</strong>
				</div>`
			);
			marker.setPopup(popup);
		}

		marker.addTo(map);
	});

	onDestroy(() => {
		if (marker) {
			marker.remove();
		}
		if (map) {
			map.remove();
		}
	});
</script>

<div bind:this={mapContainer} style="height: {height}; width: 100%; border-radius: 0.5rem;"></div>

<style>
	:global(.custom-marker) {
		cursor: pointer;
		width: 32px;
		height: 40px;
	}

	:global(.custom-marker svg) {
		display: block;
	}

	:global(.mapboxgl-popup-content) {
		border-radius: 0.5rem;
		box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
	}

	:global(.mapboxgl-popup-close-button) {
		font-size: 20px;
		padding: 0 8px;
	}
</style>
