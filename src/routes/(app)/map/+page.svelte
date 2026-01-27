<script lang="ts">
	/* eslint-disable no-undef */
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { env } from '$env/dynamic/public';
	import BaseLayout from '$lib/components/BaseLayout.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let mapContainer: HTMLDivElement;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let map: any | null = null;
	let isFullscreen = $state(false);

	/**
	 * Toggle fullscreen map mode
	 */
	function toggleFullscreen() {
		isFullscreen = !isFullscreen;
		// Resize map after DOM updates
		setTimeout(() => {
			if (map) {
				map.resize();
			}
		}, 100);
	}

	/**
	 * Format event time for display
	 */
	function formatEventTime(startTime: string): string {
		const date = new Date(startTime);
		const now = new Date();
		const isToday = date.toDateString() === now.toDateString();
		const isTomorrow = date.toDateString() === new Date(now.getTime() + 86400000).toDateString();

		const timeStr = date.toLocaleTimeString('en-US', {
			hour: 'numeric',
			minute: '2-digit',
			hour12: true
		});

		if (isToday) {
			return `Today at ${timeStr}`;
		} else if (isTomorrow) {
			return `Tomorrow at ${timeStr}`;
		} else {
			return date.toLocaleDateString('en-US', {
				month: 'short',
				day: 'numeric',
				hour: 'numeric',
				minute: '2-digit'
			});
		}
	}

	/**
	 * Navigate to event detail page
	 */
	function viewEvent(eventId: string) {
		goto(`/events/${eventId}`);
	}

	onMount(async () => {
		// Dynamically import to avoid SSR issues
		const mapboxgl = (await import('mapbox-gl')).default;
		await import('mapbox-gl/dist/mapbox-gl.css');

		// Set access token
		mapboxgl.accessToken = env.PUBLIC_MAPBOX_ACCESS_TOKEN || '';

		// Calculate initial center point (average of all event locations)
		let centerLng = -122.4194; // Default to San Francisco
		let centerLat = 37.7749;

		if (data.events.length > 0) {
			const sumLng = data.events.reduce((sum, e) => sum + (e.venue_lng || 0), 0);
			const sumLat = data.events.reduce((sum, e) => sum + (e.venue_lat || 0), 0);
			centerLng = sumLng / data.events.length;
			centerLat = sumLat / data.events.length;
		}

		// Initialize map
		map = new mapboxgl.Map({
			container: mapContainer,
			style: 'mapbox://styles/mapbox/streets-v12',
			center: [centerLng, centerLat],
			zoom: 11,
			attributionControl: true
		});

		// Add navigation controls
		map.addControl(new mapboxgl.NavigationControl(), 'top-right');

		// Add fullscreen control
		map.addControl(new mapboxgl.FullscreenControl(), 'top-right');

		// Wait for map to load before adding sources and layers
		map.on('load', () => {
			// Create GeoJSON feature collection from events
			const geojson = {
				type: 'FeatureCollection',
				features: data.events
					.filter((event) => event.venue_lat && event.venue_lng)
					.map((event) => ({
						type: 'Feature',
						geometry: {
							type: 'Point',
							coordinates: [event.venue_lng, event.venue_lat]
						},
						properties: {
							event_id: event.event_id,
							title: event.title,
							start_time: event.start_time,
							venue_name: event.venue_name || 'Venue TBD',
							goingCount: event.goingCount,
							interestedCount: event.interestedCount
						}
					}))
			};

			// Add source with clustering enabled
			map.addSource('events', {
				type: 'geojson',
				data: geojson,
				cluster: true,
				clusterMaxZoom: 14, // Max zoom to cluster points on
				clusterRadius: 50 // Radius of each cluster when clustering points (pixels)
			});

			// Add cluster circles layer
			map.addLayer({
				id: 'clusters',
				type: 'circle',
				source: 'events',
				filter: ['has', 'point_count'],
				paint: {
					// Use step expressions to create graduated circles based on cluster size
					'circle-color': [
						'step',
						['get', 'point_count'],
						'#2563EB', // Blue for small clusters (< 10)
						10,
						'#7C3AED', // Purple for medium clusters (10-30)
						30,
						'#DC2626' // Red for large clusters (> 30)
					],
					'circle-radius': [
						'step',
						['get', 'point_count'],
						20, // 20px for small clusters
						10,
						30, // 30px for medium clusters
						30,
						40 // 40px for large clusters
					],
					'circle-stroke-width': 2,
					'circle-stroke-color': '#FFFFFF'
				}
			});

			// Add cluster count labels
			map.addLayer({
				id: 'cluster-count',
				type: 'symbol',
				source: 'events',
				filter: ['has', 'point_count'],
				layout: {
					'text-field': '{point_count_abbreviated}',
					'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
					'text-size': 14
				},
				paint: {
					'text-color': '#FFFFFF'
				}
			});

			// Add individual event markers layer
			map.addLayer({
				id: 'unclustered-point',
				type: 'circle',
				source: 'events',
				filter: ['!', ['has', 'point_count']],
				paint: {
					'circle-color': '#2563EB',
					'circle-radius': 12,
					'circle-stroke-width': 2,
					'circle-stroke-color': '#FFFFFF'
				}
			});

			// Add event icon inside unclustered points
			map.addLayer({
				id: 'unclustered-icon',
				type: 'symbol',
				source: 'events',
				filter: ['!', ['has', 'point_count']],
				layout: {
					'icon-image': 'marker-15', // Use built-in marker icon
					'icon-size': 0.8,
					'icon-allow-overlap': true
				},
				paint: {
					'icon-color': '#FFFFFF'
				}
			});

			// Click handler for clusters - zoom in on click
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			map.on('click', 'clusters', (e: any) => {
				const features = map.queryRenderedFeatures(e.point, {
					layers: ['clusters']
				});
				const clusterId = features[0].properties.cluster_id;
				const source = map.getSource('events');

				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				source.getClusterExpansionZoom(clusterId, (err: any, zoom: number) => {
					if (err) return;

					map.easeTo({
						center: features[0].geometry.coordinates,
						zoom: zoom
					});
				});
			});

			// Click handler for unclustered points - show popup
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			map.on('click', 'unclustered-point', (e: any) => {
				const coordinates = e.features[0].geometry.coordinates.slice();
				const props = e.features[0].properties;

				// Ensure popup appears over the point
				while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
					coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
				}

				const popupContent = `
					<div class="event-popup">
						<div class="event-popup__title">${props.title}</div>
						<div class="event-popup__time">${formatEventTime(props.start_time)}</div>
						<div class="event-popup__venue">${props.venue_name}</div>
						<div class="event-popup__stats">
							<span class="event-popup__stat event-popup__stat--going">${props.goingCount} Going</span>
							${props.interestedCount > 0 ? `<span class="event-popup__stat event-popup__stat--interested">${props.interestedCount} Interested</span>` : ''}
						</div>
						<button class="event-popup__button" onclick="window.viewEvent_${props.event_id}()">
							View Event
						</button>
					</div>
				`;

				// Add event handler for view button
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(window as any)[`viewEvent_${props.event_id}`] = () => viewEvent(props.event_id);

				new mapboxgl.Popup({
					offset: 25,
					closeButton: true,
					closeOnClick: true,
					maxWidth: '280px'
				})
					.setLngLat(coordinates)
					.setHTML(popupContent)
					.addTo(map);
			});

			// Change cursor on hover
			map.on('mouseenter', 'clusters', () => {
				map.getCanvas().style.cursor = 'pointer';
			});

			map.on('mouseleave', 'clusters', () => {
				map.getCanvas().style.cursor = '';
			});

			map.on('mouseenter', 'unclustered-point', () => {
				map.getCanvas().style.cursor = 'pointer';
			});

			map.on('mouseleave', 'unclustered-point', () => {
				map.getCanvas().style.cursor = '';
			});

			// Fit map to show all markers if we have events
			if (data.events.length > 0 && data.events.length < 50) {
				const bounds = new mapboxgl.LngLatBounds();
				data.events.forEach((event) => {
					if (event.venue_lat && event.venue_lng) {
						bounds.extend([event.venue_lng, event.venue_lat]);
					}
				});
				map.fitBounds(bounds, { padding: 50, maxZoom: 13 });
			}
		});
	});

	onDestroy(() => {
		// Cleanup event handlers attached to window
		data.events.forEach((event) => {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			delete (window as any)[`viewEvent_${event.event_id}`];
		});

		// Cleanup map (this will also remove all layers and sources)
		if (map) {
			map.remove();
		}
	});
</script>

<svelte:head>
	<title>Discover Events - Map View</title>
</svelte:head>

<BaseLayout>
	<div class="map-page" class:map-page--fullscreen={isFullscreen}>
		<div class="map-header">
			<h1 class="map-header__title">Discover Events</h1>
			<div class="map-header__controls">
				<span class="map-header__count">{data.events.length} events</span>
				<button class="map-header__button" onclick={toggleFullscreen}>
					{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
				</button>
			</div>
		</div>

		<div class="map-container" class:map-container--fullscreen={isFullscreen}>
			<div bind:this={mapContainer} class="map"></div>
		</div>

		{#if data.events.length === 0}
			<div class="map-empty">
				<p class="map-empty__text">No upcoming events with locations found.</p>
				<a href="/events/create" class="map-empty__button">Create an Event</a>
			</div>
		{/if}
	</div>
</BaseLayout>

<style>
	.map-page {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		height: 100%;
	}

	.map-page--fullscreen {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 50;
		background: white;
		padding: 0;
		margin: 0;
	}

	.map-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.map-page--fullscreen .map-header {
		padding: 1rem;
		background: white;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.map-header__title {
		font-size: 1.5rem;
		font-weight: 700;
		margin: 0;
	}

	.map-header__controls {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.map-header__count {
		color: #6b7280;
		font-size: 0.875rem;
	}

	.map-header__button {
		padding: 0.5rem 1rem;
		background: #2563eb;
		color: white;
		border: none;
		border-radius: 0.375rem;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		min-height: 44px;
	}

	.map-header__button:hover {
		background: #1d4ed8;
	}

	.map-container {
		flex: 1;
		min-height: 500px;
		border-radius: 0.5rem;
		overflow: hidden;
		box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
	}

	.map-container--fullscreen {
		min-height: 0;
		border-radius: 0;
		height: calc(100vh - 80px);
	}

	.map {
		width: 100%;
		height: 100%;
	}

	.map-empty {
		text-align: center;
		padding: 2rem;
	}

	.map-empty__text {
		color: #6b7280;
		margin-bottom: 1rem;
	}

	.map-empty__button {
		display: inline-block;
		padding: 0.75rem 1.5rem;
		background: #2563eb;
		color: white;
		border-radius: 0.375rem;
		text-decoration: none;
		font-weight: 500;
		min-height: 44px;
	}

	.map-empty__button:hover {
		background: #1d4ed8;
	}

	/* Popup styles */
	:global(.event-popup) {
		font-family:
			system-ui,
			-apple-system,
			sans-serif;
		padding: 0.5rem;
	}

	:global(.event-popup__title) {
		font-weight: 600;
		font-size: 1rem;
		margin-bottom: 0.5rem;
		line-height: 1.3;
	}

	:global(.event-popup__time) {
		font-size: 0.875rem;
		color: #2563eb;
		margin-bottom: 0.25rem;
	}

	:global(.event-popup__venue) {
		font-size: 0.875rem;
		color: #6b7280;
		margin-bottom: 0.5rem;
	}

	:global(.event-popup__stats) {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 0.75rem;
		flex-wrap: wrap;
	}

	:global(.event-popup__stat) {
		font-size: 0.75rem;
		padding: 0.25rem 0.5rem;
		border-radius: 0.25rem;
		font-weight: 500;
	}

	:global(.event-popup__stat--going) {
		background: #dbeafe;
		color: #1e40af;
	}

	:global(.event-popup__stat--interested) {
		background: #fef3c7;
		color: #92400e;
	}

	:global(.event-popup__button) {
		width: 100%;
		padding: 0.5rem 1rem;
		background: #2563eb;
		color: white;
		border: none;
		border-radius: 0.375rem;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		min-height: 44px;
	}

	:global(.event-popup__button:hover) {
		background: #1d4ed8;
	}

	:global(.mapboxgl-popup-content) {
		border-radius: 0.5rem;
		padding: 0;
		box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
	}

	:global(.mapboxgl-popup-close-button) {
		font-size: 20px;
		padding: 0 8px;
		color: #6b7280;
	}

	/* Mobile responsiveness */
	@media (max-width: 640px) {
		.map-header__title {
			font-size: 1.25rem;
		}

		.map-container {
			min-height: 400px;
		}

		.map-container--fullscreen {
			height: calc(100vh - 100px);
		}
	}

	/* Tablet and larger */
	@media (min-width: 768px) {
		.map-container {
			min-height: 600px;
		}
	}
</style>
