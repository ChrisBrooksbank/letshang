import { env } from '$env/dynamic/public';

/**
 * Geocode an address using Mapbox Geocoding API
 * Returns coordinates (lat/lng) for the given address
 */
export async function geocodeAddress(address: string): Promise<{
	lat: number;
	lng: number;
} | null> {
	if (!address || address.trim() === '') {
		return null;
	}

	const accessToken = env.PUBLIC_MAPBOX_ACCESS_TOKEN;
	if (!accessToken) {
		// eslint-disable-next-line no-console
		console.warn('Mapbox access token not configured');
		return null;
	}

	try {
		const encodedAddress = encodeURIComponent(address.trim());
		const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json?access_token=${accessToken}&limit=1&types=address,poi`;

		const response = await fetch(url);
		if (!response.ok) {
			throw new Error(`Geocoding failed: ${response.statusText}`);
		}

		const data = await response.json();

		if (data.features && data.features.length > 0) {
			const [lng, lat] = data.features[0].center;
			return { lat, lng };
		}

		return null;
	} catch (error) {
		// Log error for debugging but don't throw - allow form submission with coordinates
		if (typeof window !== 'undefined') {
			// eslint-disable-next-line no-console
			console.warn('Geocoding error:', error);
		}
		return null;
	}
}

/**
 * Generate a Google Maps directions URL
 */
export function getDirectionsUrl(lat: number, lng: number): string {
	return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}
