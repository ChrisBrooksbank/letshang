/**
 * Utilities for "Happening Now" feature - events currently in progress
 */

const MINIMUM_JOIN_LATE_MINUTES = 15;

/**
 * Check if an event is currently in progress
 * @param startTime - ISO 8601 datetime string
 * @param endTime - ISO 8601 datetime string or null
 * @returns true if event has started and has not ended
 */
export function isEventHappeningNow(startTime: string, endTime: string | null): boolean {
	if (!endTime) {
		return false;
	}

	const now = new Date();
	const start = new Date(startTime);
	const end = new Date(endTime);

	// Event is happening if: now >= start AND now < end
	return now >= start && now < end;
}

/**
 * Check if an event can be joined late (still has meaningful time remaining)
 * @param startTime - ISO 8601 datetime string
 * @param endTime - ISO 8601 datetime string or null
 * @returns true if event is in progress and has at least 15 minutes remaining
 */
export function canJoinLate(startTime: string, endTime: string | null): boolean {
	if (!isEventHappeningNow(startTime, endTime) || !endTime) {
		return false;
	}

	const remaining = minutesUntilEnd(endTime);
	return remaining >= MINIMUM_JOIN_LATE_MINUTES;
}

/**
 * Calculate minutes remaining until event ends
 * @param endTime - ISO 8601 datetime string or null
 * @returns minutes until end, or 0 if ended/null
 */
export function minutesUntilEnd(endTime: string | null): number {
	if (!endTime) {
		return 0;
	}

	const now = new Date();
	const end = new Date(endTime);
	const diffMs = end.getTime() - now.getTime();

	// If event has ended, return 0
	if (diffMs <= 0) {
		return 0;
	}

	// Convert milliseconds to minutes and round down
	return Math.floor(diffMs / (1000 * 60));
}
