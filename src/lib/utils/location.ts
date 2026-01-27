/**
 * Location utilities for distance calculation and geolocation
 * Uses the Haversine formula for accurate distance calculations
 */

/**
 * Coordinates interface
 */
export interface Coordinates {
	lat: number;
	lng: number;
}

/**
 * Calculate the distance between two coordinates using the Haversine formula
 * Returns distance in miles
 *
 * @param coord1 - First coordinate (lat/lng)
 * @param coord2 - Second coordinate (lat/lng)
 * @returns Distance in miles
 */
export function calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
	const EARTH_RADIUS_MILES = 3959; // Earth's radius in miles
	const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

	const lat1Rad = toRadians(coord1.lat);
	const lat2Rad = toRadians(coord2.lat);
	const deltaLat = toRadians(coord2.lat - coord1.lat);
	const deltaLng = toRadians(coord2.lng - coord1.lng);

	// Haversine formula
	const a =
		Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
		Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

	return EARTH_RADIUS_MILES * c;
}

/**
 * Format distance for display
 * Shows decimal places only when needed
 *
 * @param miles - Distance in miles
 * @returns Formatted distance string (e.g., "2 mi", "5.3 mi", "0.5 mi")
 */
export function formatDistance(miles: number): string {
	if (miles < 0.1) {
		return '<0.1 mi';
	}

	if (miles < 1) {
		return `${miles.toFixed(1)} mi`;
	}

	if (miles < 10) {
		return `${miles.toFixed(1)} mi`;
	}

	return `${Math.round(miles)} mi`;
}

/**
 * Get user's current location using the Geolocation API
 * Requires user permission
 *
 * @returns Promise resolving to current coordinates or null if denied/unavailable
 */
export async function getCurrentLocation(): Promise<Coordinates | null> {
	if (typeof window === 'undefined' || !navigator.geolocation) {
		return null;
	}

	return new Promise((resolve) => {
		navigator.geolocation.getCurrentPosition(
			(position) => {
				resolve({
					lat: position.coords.latitude,
					lng: position.coords.longitude
				});
			},
			() => {
				// User denied or error occurred
				resolve(null);
			},
			{
				enableHighAccuracy: false,
				timeout: 10000,
				maximumAge: 300000 // Cache for 5 minutes
			}
		);
	});
}

/**
 * Check if coordinates are valid
 * Lat must be between -90 and 90, lng between -180 and 180
 *
 * @param coord - Coordinates to validate
 * @returns True if valid coordinates
 */
export function isValidCoordinate(coord: Coordinates | null | undefined): coord is Coordinates {
	if (!coord || typeof coord.lat !== 'number' || typeof coord.lng !== 'number') {
		return false;
	}

	return coord.lat >= -90 && coord.lat <= 90 && coord.lng >= -180 && coord.lng <= 180;
}

/**
 * Parse coordinates from string format "lat,lng"
 * Used for URL params and storage
 *
 * @param coordString - String in format "lat,lng" (e.g., "37.7749,-122.4194")
 * @returns Parsed coordinates or null if invalid
 */
export function parseCoordinates(coordString: string | null | undefined): Coordinates | null {
	if (!coordString || typeof coordString !== 'string') {
		return null;
	}

	const parts = coordString.split(',');
	if (parts.length !== 2) {
		return null;
	}

	const lat = parseFloat(parts[0]);
	const lng = parseFloat(parts[1]);

	const coord = { lat, lng };
	return isValidCoordinate(coord) ? coord : null;
}

/**
 * Format coordinates as string "lat,lng"
 * Used for URL params and storage
 *
 * @param coord - Coordinates to format
 * @returns String in format "lat,lng" or null if invalid
 */
export function formatCoordinates(coord: Coordinates | null | undefined): string | null {
	if (!isValidCoordinate(coord)) {
		return null;
	}

	return `${coord.lat},${coord.lng}`;
}
