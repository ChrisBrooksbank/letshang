/**
 * Confirmation Ping Utilities
 *
 * Utilities for formatting and managing day-of confirmation pings.
 */

export type ConfirmationStatus = 'pending' | 'confirmed' | 'bailed_out';

/**
 * Get human-readable label for confirmation status
 */
export function getConfirmationStatusLabel(status: ConfirmationStatus): string {
	const labels: Record<ConfirmationStatus, string> = {
		pending: 'Pending',
		confirmed: 'Confirmed',
		bailed_out: 'Bailed Out'
	};
	return labels[status];
}

/**
 * Get color class for confirmation status badge
 */
export function getConfirmationStatusColor(status: ConfirmationStatus): string {
	const colors: Record<ConfirmationStatus, string> = {
		pending: 'bg-yellow-100 text-yellow-800',
		confirmed: 'bg-green-100 text-green-800',
		bailed_out: 'bg-gray-100 text-gray-800'
	};
	return colors[status];
}

/**
 * Check if event should show confirmation ping UI
 * Confirmation pings are relevant on the day of the event
 *
 * @param eventStartTime - Event start time (ISO 8601 string or Date)
 * @returns True if confirmation UI should be shown
 */
export function shouldShowConfirmation(eventStartTime: string | Date): boolean {
	const startTime = typeof eventStartTime === 'string' ? new Date(eventStartTime) : eventStartTime;
	const now = new Date();

	// Check if event is today
	const isToday =
		startTime.getDate() === now.getDate() &&
		startTime.getMonth() === now.getMonth() &&
		startTime.getFullYear() === now.getFullYear();

	// Check if event hasn't started yet
	const hasNotStarted = startTime > now;

	return isToday && hasNotStarted;
}

/**
 * Get confirmation message based on status
 *
 * @param status - Confirmation status
 * @param eventTitle - Event title
 * @returns Appropriate message for the confirmation status
 */
export function getConfirmationMessage(status: ConfirmationStatus, eventTitle: string): string {
	const messages: Record<ConfirmationStatus, string> = {
		pending: `Are you still coming to ${eventTitle}?`,
		confirmed: `Great! We'll see you at ${eventTitle}.`,
		bailed_out: 'Thanks for letting us know. Hope to see you at the next event!'
	};
	return messages[status];
}

/**
 * Format confirmation statistics for display
 *
 * @param stats - Confirmation statistics object
 * @returns Formatted string
 */
export function formatConfirmationStats(stats: {
	total: number;
	pending: number;
	confirmed: number;
	bailedOut: number;
}): string {
	if (stats.total === 0) {
		return 'No confirmations yet';
	}

	const parts: string[] = [];

	if (stats.confirmed > 0) {
		parts.push(`${stats.confirmed} confirmed`);
	}

	if (stats.pending > 0) {
		parts.push(`${stats.pending} pending`);
	}

	if (stats.bailedOut > 0) {
		parts.push(`${stats.bailedOut} bailed out`);
	}

	return parts.join(', ');
}

/**
 * Calculate confirmation response rate
 *
 * @param stats - Confirmation statistics
 * @returns Response rate as percentage (0-100)
 */
export function calculateConfirmationResponseRate(stats: {
	total: number;
	pending: number;
	confirmed: number;
	bailedOut: number;
}): number {
	if (stats.total === 0) {
		return 0;
	}

	const responded = stats.confirmed + stats.bailedOut;
	return Math.round((responded / stats.total) * 100);
}

/**
 * Get emoji for confirmation status
 */
export function getConfirmationEmoji(status: ConfirmationStatus): string {
	const emojis: Record<ConfirmationStatus, string> = {
		pending: '⏳',
		confirmed: '✅',
		bailed_out: '❌'
	};
	return emojis[status];
}
