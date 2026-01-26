/**
 * Event size utilities
 * Calculate and format event size categories based on capacity
 */

export type EventSize = 'intimate' | 'small' | 'medium' | 'large';

/**
 * Calculate event size category from capacity
 * @param capacity - Event capacity (number of attendees)
 * @returns Event size category or null if capacity is null/undefined
 *
 * Categories:
 * - Intimate: under 10 people
 * - Small: 10-20 people
 * - Medium: 20-50 people
 * - Large: 50+ people
 */
export function calculateEventSize(capacity: number | null | undefined): EventSize | null {
	if (capacity === null || capacity === undefined) {
		return null;
	}

	if (capacity < 10) {
		return 'intimate';
	} else if (capacity >= 10 && capacity < 20) {
		return 'small';
	} else if (capacity >= 20 && capacity < 50) {
		return 'medium';
	} else {
		return 'large';
	}
}

/**
 * Get user-friendly label for event size
 * @param size - Event size category
 * @returns Formatted label for display
 */
export function getEventSizeLabel(size: EventSize | null | undefined): string | null {
	if (!size) {
		return null;
	}

	const labels: Record<EventSize, string> = {
		intimate: 'Intimate',
		small: 'Small',
		medium: 'Medium',
		large: 'Large'
	};

	return labels[size];
}

/**
 * Get description for event size category
 * Positions small events as welcoming, not lesser
 * @param size - Event size category
 * @returns Description text
 */
export function getEventSizeDescription(size: EventSize | null | undefined): string | null {
	if (!size) {
		return null;
	}

	const descriptions: Record<EventSize, string> = {
		intimate: 'Under 10 people - perfect for deep conversations',
		small: '10-20 people - cozy and welcoming',
		medium: '20-50 people - great mix of energy and connection',
		large: '50+ people - vibrant and diverse crowd'
	};

	return descriptions[size];
}

/**
 * Get the expected capacity range for a given size category
 * @param size - Event size category
 * @returns Human-readable capacity range
 */
export function getEventSizeCapacityRange(size: EventSize): string {
	const ranges: Record<EventSize, string> = {
		intimate: 'Under 10',
		small: '10-20',
		medium: '20-50',
		large: '50+'
	};

	return ranges[size];
}
