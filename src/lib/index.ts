// place files you want to import through the `$lib` alias in this folder.

// Export mobile-first base layout component
export { default as BaseLayout } from './components/BaseLayout.svelte';

// Export geocoding utilities for Mapbox integration
export { geocodeAddress, getDirectionsUrl } from './utils/geocoding';
