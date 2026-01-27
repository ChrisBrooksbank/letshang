/**
 * Date filter utilities for quick time-based filtering
 * Provides preset date ranges for Today, Tomorrow, This Weekend, This Week
 */

export type QuickFilter = 'today' | 'tomorrow' | 'this-weekend' | 'this-week';

export interface DateRange {
	startDate: string; // YYYY-MM-DD format
	endDate: string; // YYYY-MM-DD format
}

/**
 * Get the start and end dates for a quick filter preset
 * All dates are in local timezone and returned in YYYY-MM-DD format
 */
export function getDateRangeForQuickFilter(filter: QuickFilter): DateRange {
	const now = new Date();
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

	switch (filter) {
		case 'today': {
			return {
				startDate: formatDate(today),
				endDate: formatDate(today)
			};
		}

		case 'tomorrow': {
			const tomorrow = new Date(today);
			tomorrow.setDate(tomorrow.getDate() + 1);
			return {
				startDate: formatDate(tomorrow),
				endDate: formatDate(tomorrow)
			};
		}

		case 'this-weekend': {
			// Weekend = upcoming Friday 6pm through Sunday 11:59pm
			// If today is Monday-Thursday, show this coming weekend
			// If today is Friday-Sunday, show this current weekend
			const dayOfWeek = today.getDay(); // 0 = Sunday, 6 = Saturday

			let friday: Date;
			let sunday: Date;

			if (dayOfWeek === 0) {
				// Sunday - weekend is today only
				sunday = new Date(today);
				friday = new Date(today);
				friday.setDate(friday.getDate() - 2); // Go back to Friday
			} else if (dayOfWeek === 6) {
				// Saturday - weekend is Fri-Sun
				friday = new Date(today);
				friday.setDate(friday.getDate() - 1); // Yesterday was Friday
				sunday = new Date(today);
				sunday.setDate(sunday.getDate() + 1); // Tomorrow is Sunday
			} else if (dayOfWeek === 5) {
				// Friday - weekend starts today
				friday = new Date(today);
				sunday = new Date(today);
				sunday.setDate(sunday.getDate() + 2); // Sunday is 2 days away
			} else {
				// Monday-Thursday - show upcoming weekend
				friday = new Date(today);
				friday.setDate(friday.getDate() + (5 - dayOfWeek)); // Days until Friday
				sunday = new Date(friday);
				sunday.setDate(sunday.getDate() + 2); // Sunday is 2 days after Friday
			}

			return {
				startDate: formatDate(friday),
				endDate: formatDate(sunday)
			};
		}

		case 'this-week': {
			// Week = Monday through Sunday
			const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.

			// Calculate Monday of current week
			const monday = new Date(today);
			const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // If Sunday, go back 6 days
			monday.setDate(monday.getDate() - daysFromMonday);

			// Calculate Sunday of current week
			const sunday = new Date(monday);
			sunday.setDate(sunday.getDate() + 6);

			return {
				startDate: formatDate(monday),
				endDate: formatDate(sunday)
			};
		}

		default: {
			// TypeScript exhaustiveness check
			const _exhaustive: never = filter;
			throw new Error(`Unknown filter: ${_exhaustive}`);
		}
	}
}

/**
 * Format a Date object to YYYY-MM-DD string
 */
function formatDate(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

/**
 * Get display label for a quick filter
 */
export function getQuickFilterLabel(filter: QuickFilter): string {
	switch (filter) {
		case 'today':
			return 'Today';
		case 'tomorrow':
			return 'Tomorrow';
		case 'this-weekend':
			return 'This Weekend';
		case 'this-week':
			return 'This Week';
		default: {
			const _exhaustive: never = filter;
			throw new Error(`Unknown filter: ${_exhaustive}`);
		}
	}
}

/**
 * Check if a date range matches a quick filter preset
 * Used to highlight active quick filters
 */
export function isQuickFilterActive(
	filter: QuickFilter,
	currentStartDate: string | null,
	currentEndDate: string | null
): boolean {
	if (!currentStartDate || !currentEndDate) {
		return false;
	}

	const range = getDateRangeForQuickFilter(filter);
	return range.startDate === currentStartDate && range.endDate === currentEndDate;
}
