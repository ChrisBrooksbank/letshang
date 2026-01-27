/**
 * Tests for Calendar Utility Functions
 */

import { describe, it, expect } from 'vitest';
import {
	getFirstDayOfMonth,
	getLastDayOfMonth,
	getDaysInMonth,
	getFirstDayOfWeek,
	getCalendarDays,
	getWeekBounds,
	getWeekDays,
	isSameDay,
	isInMonth,
	isToday,
	formatDateISO,
	formatMonthYear,
	getMonthName,
	getDayName,
	getPreviousMonth,
	getNextMonth,
	getPreviousWeek,
	getNextWeek,
	getMonthBoundsISO,
	getWeekBoundsISO
} from './calendar';

describe('Calendar Utility Functions', () => {
	describe('getFirstDayOfMonth', () => {
		it('should return the first day of the month', () => {
			const date = new Date(2026, 0, 15); // January 15, 2026
			const firstDay = getFirstDayOfMonth(date);
			expect(firstDay.getDate()).toBe(1);
			expect(firstDay.getMonth()).toBe(0);
			expect(firstDay.getFullYear()).toBe(2026);
		});

		it('should handle December correctly', () => {
			const date = new Date(2026, 11, 25); // December 25, 2026
			const firstDay = getFirstDayOfMonth(date);
			expect(firstDay.getDate()).toBe(1);
			expect(firstDay.getMonth()).toBe(11);
		});
	});

	describe('getLastDayOfMonth', () => {
		it('should return the last day of January (31)', () => {
			const date = new Date(2026, 0, 15);
			const lastDay = getLastDayOfMonth(date);
			expect(lastDay.getDate()).toBe(31);
		});

		it('should return the last day of February in non-leap year (28)', () => {
			const date = new Date(2026, 1, 15); // February 2026 (non-leap)
			const lastDay = getLastDayOfMonth(date);
			expect(lastDay.getDate()).toBe(28);
		});

		it('should return the last day of February in leap year (29)', () => {
			const date = new Date(2024, 1, 15); // February 2024 (leap year)
			const lastDay = getLastDayOfMonth(date);
			expect(lastDay.getDate()).toBe(29);
		});
	});

	describe('getDaysInMonth', () => {
		it('should return 31 for January', () => {
			const date = new Date(2026, 0, 1);
			expect(getDaysInMonth(date)).toBe(31);
		});

		it('should return 28 for February in non-leap year', () => {
			const date = new Date(2026, 1, 1);
			expect(getDaysInMonth(date)).toBe(28);
		});

		it('should return 29 for February in leap year', () => {
			const date = new Date(2024, 1, 1);
			expect(getDaysInMonth(date)).toBe(29);
		});

		it('should return 30 for April', () => {
			const date = new Date(2026, 3, 1);
			expect(getDaysInMonth(date)).toBe(30);
		});
	});

	describe('getFirstDayOfWeek', () => {
		it('should return the correct day of week for January 2026 (Wednesday = 3)', () => {
			const date = new Date(2026, 0, 1); // January 1, 2026 is a Thursday
			const dayOfWeek = getFirstDayOfWeek(date);
			expect(dayOfWeek).toBe(4); // Thursday
		});

		it('should return Sunday (0) when first day is Sunday', () => {
			const date = new Date(2026, 1, 1); // February 1, 2026
			const dayOfWeek = getFirstDayOfWeek(date);
			expect(dayOfWeek).toBe(0); // Sunday
		});
	});

	describe('getCalendarDays', () => {
		it('should return 42 days (6 weeks)', () => {
			const days = getCalendarDays(2026, 0); // January 2026
			expect(days.length).toBe(42);
		});

		it('should include padding days from previous month', () => {
			const days = getCalendarDays(2026, 0); // January 2026 starts on Thursday
			// First day should be from previous month (December)
			expect(days[0].getMonth()).toBe(11); // December
		});

		it('should include padding days from next month', () => {
			const days = getCalendarDays(2026, 0); // January 2026
			// Last days should be from next month (February)
			const lastDay = days[days.length - 1];
			expect(lastDay.getMonth()).toBe(1); // February
		});

		it('should include all days of the current month', () => {
			const days = getCalendarDays(2026, 0); // January 2026 has 31 days
			const januaryDays = days.filter((d) => d.getMonth() === 0);
			expect(januaryDays.length).toBe(31);
		});
	});

	describe('getWeekBounds', () => {
		it('should return Sunday to Saturday for a week', () => {
			const date = new Date(2026, 0, 15); // January 15, 2026 (Thursday)
			const { start, end } = getWeekBounds(date);
			expect(start.getDay()).toBe(0); // Sunday
			expect(end.getDay()).toBe(6); // Saturday
		});

		it('should span exactly 7 days', () => {
			const date = new Date(2026, 0, 15);
			const { start, end } = getWeekBounds(date);
			const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
			expect(diffDays).toBe(7); // Full week from Sunday 00:00 to Saturday 23:59
		});
	});

	describe('getWeekDays', () => {
		it('should return 7 days', () => {
			const date = new Date(2026, 0, 15);
			const days = getWeekDays(date);
			expect(days.length).toBe(7);
		});

		it('should start with Sunday', () => {
			const date = new Date(2026, 0, 15);
			const days = getWeekDays(date);
			expect(days[0].getDay()).toBe(0); // Sunday
		});

		it('should end with Saturday', () => {
			const date = new Date(2026, 0, 15);
			const days = getWeekDays(date);
			expect(days[6].getDay()).toBe(6); // Saturday
		});
	});

	describe('isSameDay', () => {
		it('should return true for same day', () => {
			const date1 = new Date(2026, 0, 15, 10, 0, 0);
			const date2 = new Date(2026, 0, 15, 15, 0, 0);
			expect(isSameDay(date1, date2)).toBe(true);
		});

		it('should return false for different days', () => {
			const date1 = new Date(2026, 0, 15);
			const date2 = new Date(2026, 0, 16);
			expect(isSameDay(date1, date2)).toBe(false);
		});

		it('should return false for same day in different months', () => {
			const date1 = new Date(2026, 0, 15);
			const date2 = new Date(2026, 1, 15);
			expect(isSameDay(date1, date2)).toBe(false);
		});
	});

	describe('isInMonth', () => {
		it('should return true for date in month', () => {
			const date = new Date(2026, 0, 15); // January 15
			expect(isInMonth(date, 0)).toBe(true);
		});

		it('should return false for date in different month', () => {
			const date = new Date(2026, 0, 15); // January 15
			expect(isInMonth(date, 1)).toBe(false);
		});
	});

	describe('isToday', () => {
		it('should return true for today', () => {
			const today = new Date();
			expect(isToday(today)).toBe(true);
		});

		it('should return false for yesterday', () => {
			const yesterday = new Date();
			yesterday.setDate(yesterday.getDate() - 1);
			expect(isToday(yesterday)).toBe(false);
		});

		it('should return false for tomorrow', () => {
			const tomorrow = new Date();
			tomorrow.setDate(tomorrow.getDate() + 1);
			expect(isToday(tomorrow)).toBe(false);
		});
	});

	describe('formatDateISO', () => {
		it('should format date as YYYY-MM-DD', () => {
			const date = new Date(2026, 0, 15); // January 15, 2026
			expect(formatDateISO(date)).toBe('2026-01-15');
		});

		it('should pad single digit months', () => {
			const date = new Date(2026, 0, 5); // January 5, 2026
			expect(formatDateISO(date)).toBe('2026-01-05');
		});

		it('should pad single digit days', () => {
			const date = new Date(2026, 9, 5); // October 5, 2026
			expect(formatDateISO(date)).toBe('2026-10-05');
		});
	});

	describe('formatMonthYear', () => {
		it('should format month and year', () => {
			const date = new Date(2026, 0, 15);
			expect(formatMonthYear(date)).toBe('January 2026');
		});

		it('should handle December', () => {
			const date = new Date(2026, 11, 15);
			expect(formatMonthYear(date)).toBe('December 2026');
		});
	});

	describe('getMonthName', () => {
		it('should return correct month names', () => {
			expect(getMonthName(0)).toBe('January');
			expect(getMonthName(5)).toBe('June');
			expect(getMonthName(11)).toBe('December');
		});
	});

	describe('getDayName', () => {
		it('should return full day names', () => {
			expect(getDayName(0)).toBe('Sunday');
			expect(getDayName(3)).toBe('Wednesday');
			expect(getDayName(6)).toBe('Saturday');
		});

		it('should return short day names when requested', () => {
			expect(getDayName(0, true)).toBe('Sun');
			expect(getDayName(3, true)).toBe('Wed');
			expect(getDayName(6, true)).toBe('Sat');
		});
	});

	describe('getPreviousMonth', () => {
		it('should return previous month', () => {
			const date = new Date(2026, 5, 15); // June 2026
			const prev = getPreviousMonth(date);
			expect(prev.getMonth()).toBe(4); // May
			expect(prev.getFullYear()).toBe(2026);
		});

		it('should roll over year when going from January to December', () => {
			const date = new Date(2026, 0, 15); // January 2026
			const prev = getPreviousMonth(date);
			expect(prev.getMonth()).toBe(11); // December
			expect(prev.getFullYear()).toBe(2025);
		});
	});

	describe('getNextMonth', () => {
		it('should return next month', () => {
			const date = new Date(2026, 5, 15); // June 2026
			const next = getNextMonth(date);
			expect(next.getMonth()).toBe(6); // July
			expect(next.getFullYear()).toBe(2026);
		});

		it('should roll over year when going from December to January', () => {
			const date = new Date(2026, 11, 15); // December 2026
			const next = getNextMonth(date);
			expect(next.getMonth()).toBe(0); // January
			expect(next.getFullYear()).toBe(2027);
		});
	});

	describe('getPreviousWeek', () => {
		it('should return date 7 days earlier', () => {
			const date = new Date(2026, 0, 15);
			const prev = getPreviousWeek(date);
			expect(prev.getDate()).toBe(8);
		});
	});

	describe('getNextWeek', () => {
		it('should return date 7 days later', () => {
			const date = new Date(2026, 0, 15);
			const next = getNextWeek(date);
			expect(next.getDate()).toBe(22);
		});
	});

	describe('getMonthBoundsISO', () => {
		it('should return ISO date strings for month bounds', () => {
			const { start, end } = getMonthBoundsISO(2026, 0); // January 2026
			expect(start).toMatch(/^\d{4}-\d{2}-\d{2}T/);
			expect(end).toMatch(/^\d{4}-\d{2}-\d{2}T/);
		});

		it('should include padding days from previous and next month', () => {
			const { start, end } = getMonthBoundsISO(2026, 0); // January 2026
			const startDate = new Date(start);
			const endDate = new Date(end);

			// January 2026 starts on Thursday, so start should be the Sunday before
			expect(startDate.getMonth()).toBe(11); // December 2025

			// Should end on a Saturday in February
			expect(endDate.getDay()).toBe(6); // Saturday
		});
	});

	describe('getWeekBoundsISO', () => {
		it('should return ISO date strings for week bounds', () => {
			const date = new Date(2026, 0, 15);
			const { start, end } = getWeekBoundsISO(date);
			expect(start).toMatch(/^\d{4}-\d{2}-\d{2}T/);
			expect(end).toMatch(/^\d{4}-\d{2}-\d{2}T/);
		});

		it('should start on Sunday and end on Saturday', () => {
			const date = new Date(2026, 0, 15); // Thursday
			const { start, end } = getWeekBoundsISO(date);
			const startDate = new Date(start);
			const endDate = new Date(end);

			expect(startDate.getDay()).toBe(0); // Sunday
			expect(endDate.getDay()).toBe(6); // Saturday
		});
	});
});
