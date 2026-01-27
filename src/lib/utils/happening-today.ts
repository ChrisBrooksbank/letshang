/**
 * Utilities for "Happening Today" feature - events happening later today
 */

/**
 * Calculate minutes until an event starts
 * @param startTime - ISO 8601 datetime string
 * @returns minutes until start, or 0 if already started
 */
export function minutesUntilStart(startTime: string): number {
	const now = new Date();
	const start = new Date(startTime);
	const diffMs = start.getTime() - now.getTime();

	// If event has started, return 0
	if (diffMs <= 0) {
		return 0;
	}

	// Convert milliseconds to minutes and round down
	return Math.floor(diffMs / (1000 * 60));
}

/**
 * Format time until event starts for display
 * @param startTime - ISO 8601 datetime string
 * @returns Formatted string like "in 2h 30m" or "in 45m"
 */
export function formatTimeUntilStart(startTime: string): string {
	const minutes = minutesUntilStart(startTime);

	if (minutes === 0) {
		return 'Starting now';
	}

	if (minutes < 60) {
		return `in ${minutes}m`;
	}

	const hours = Math.floor(minutes / 60);
	const remainingMinutes = minutes % 60;

	if (remainingMinutes === 0) {
		return `in ${hours}h`;
	}

	return `in ${hours}h ${remainingMinutes}m`;
}

/**
 * Check if an event is starting soon (within 2 hours)
 * @param startTime - ISO 8601 datetime string
 * @returns true if event starts within 2 hours
 */
export function isStartingSoon(startTime: string): boolean {
	const minutes = minutesUntilStart(startTime);
	return minutes > 0 && minutes <= 120;
}
