/**
 * Calendar Utility Functions
 *
 * Pure functions for calendar date calculations and formatting.
 */

/**
 * Get the first day of the month for a given date
 */
export function getFirstDayOfMonth(date: Date): Date {
	return new Date(date.getFullYear(), date.getMonth(), 1);
}

/**
 * Get the last day of the month for a given date
 */
export function getLastDayOfMonth(date: Date): Date {
	return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

/**
 * Get the number of days in a month
 */
export function getDaysInMonth(date: Date): number {
	return getLastDayOfMonth(date).getDate();
}

/**
 * Get the day of week for the first day of the month (0 = Sunday, 6 = Saturday)
 */
export function getFirstDayOfWeek(date: Date): number {
	return getFirstDayOfMonth(date).getDay();
}

/**
 * Get an array of dates for the calendar grid (including padding days from prev/next month)
 * Returns 42 days (6 weeks) to ensure consistent grid size
 */
export function getCalendarDays(year: number, month: number): Date[] {
	const firstDay = new Date(year, month, 1);
	const lastDay = new Date(year, month + 1, 0);
	const firstDayOfWeek = firstDay.getDay();
	const daysInMonth = lastDay.getDate();

	const days: Date[] = [];

	// Add padding days from previous month
	const prevMonthLastDay = new Date(year, month, 0).getDate();
	for (let i = firstDayOfWeek - 1; i >= 0; i--) {
		days.push(new Date(year, month - 1, prevMonthLastDay - i));
	}

	// Add days of current month
	for (let i = 1; i <= daysInMonth; i++) {
		days.push(new Date(year, month, i));
	}

	// Add padding days from next month to complete 6 weeks (42 days)
	const remainingDays = 42 - days.length;
	for (let i = 1; i <= remainingDays; i++) {
		days.push(new Date(year, month + 1, i));
	}

	return days;
}

/**
 * Get the start and end of the current week (Sunday to Saturday)
 */
export function getWeekBounds(date: Date): { start: Date; end: Date } {
	const dayOfWeek = date.getDay();
	const start = new Date(date);
	start.setDate(date.getDate() - dayOfWeek);
	start.setHours(0, 0, 0, 0);

	const end = new Date(start);
	end.setDate(start.getDate() + 6);
	end.setHours(23, 59, 59, 999);

	return { start, end };
}

/**
 * Get an array of dates for the week view
 */
export function getWeekDays(date: Date): Date[] {
	const { start } = getWeekBounds(date);
	const days: Date[] = [];

	for (let i = 0; i < 7; i++) {
		const day = new Date(start);
		day.setDate(start.getDate() + i);
		days.push(day);
	}

	return days;
}

/**
 * Check if two dates are the same day
 */
export function isSameDay(date1: Date, date2: Date): boolean {
	return (
		date1.getFullYear() === date2.getFullYear() &&
		date1.getMonth() === date2.getMonth() &&
		date1.getDate() === date2.getDate()
	);
}

/**
 * Check if a date is in the current month
 */
export function isInMonth(date: Date, month: number): boolean {
	return date.getMonth() === month;
}

/**
 * Check if a date is today
 */
export function isToday(date: Date): boolean {
	return isSameDay(date, new Date());
}

/**
 * Format a date as YYYY-MM-DD (for API calls)
 */
export function formatDateISO(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

/**
 * Format a month and year for display
 */
export function formatMonthYear(date: Date): string {
	return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

/**
 * Get month name
 */
export function getMonthName(monthIndex: number): string {
	const months = [
		'January',
		'February',
		'March',
		'April',
		'May',
		'June',
		'July',
		'August',
		'September',
		'October',
		'November',
		'December'
	];
	return months[monthIndex];
}

/**
 * Get short day name
 */
export function getDayName(dayIndex: number, short = false): string {
	const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
	const shortDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
	return short ? shortDays[dayIndex] : days[dayIndex];
}

/**
 * Navigate to previous month
 */
export function getPreviousMonth(date: Date): Date {
	return new Date(date.getFullYear(), date.getMonth() - 1, 1);
}

/**
 * Navigate to next month
 */
export function getNextMonth(date: Date): Date {
	return new Date(date.getFullYear(), date.getMonth() + 1, 1);
}

/**
 * Navigate to previous week
 */
export function getPreviousWeek(date: Date): Date {
	const newDate = new Date(date);
	newDate.setDate(date.getDate() - 7);
	return newDate;
}

/**
 * Navigate to next week
 */
export function getNextWeek(date: Date): Date {
	const newDate = new Date(date);
	newDate.setDate(date.getDate() + 7);
	return newDate;
}

/**
 * Get the start and end dates for the month view (ISO format for API)
 */
export function getMonthBoundsISO(year: number, month: number): { start: string; end: string } {
	// Get first and last day of the calendar grid (including padding days)
	const calendarDays = getCalendarDays(year, month);
	const firstDay = calendarDays[0];
	const lastDay = calendarDays[calendarDays.length - 1];

	// Convert to ISO date strings with time
	const start = new Date(firstDay);
	start.setHours(0, 0, 0, 0);

	const end = new Date(lastDay);
	end.setHours(23, 59, 59, 999);

	return {
		start: start.toISOString(),
		end: end.toISOString()
	};
}

/**
 * Get the start and end dates for the week view (ISO format for API)
 */
export function getWeekBoundsISO(date: Date): { start: string; end: string } {
	const { start, end } = getWeekBounds(date);
	return {
		start: start.toISOString(),
		end: end.toISOString()
	};
}
