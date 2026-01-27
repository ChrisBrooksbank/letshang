import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import {
	getDateRangeForQuickFilter,
	getQuickFilterLabel,
	isQuickFilterActive
} from './date-filters';

describe('Date Filters', () => {
	// Save original Date
	const RealDate = Date;

	afterEach(() => {
		// Restore original Date
		vi.useRealTimers();
		global.Date = RealDate;
	});

	describe('getDateRangeForQuickFilter', () => {
		describe('today filter', () => {
			it('should return today for start and end date', () => {
				// Mock current date to Wednesday, Jan 29, 2026
				vi.useFakeTimers();
				vi.setSystemTime(new Date('2026-01-29T14:30:00Z'));

				const result = getDateRangeForQuickFilter('today');

				expect(result.startDate).toBe('2026-01-29');
				expect(result.endDate).toBe('2026-01-29');
			});

			it('should work at midnight', () => {
				vi.useFakeTimers();
				vi.setSystemTime(new Date('2026-01-29T00:00:00Z'));

				const result = getDateRangeForQuickFilter('today');

				expect(result.startDate).toBe('2026-01-29');
				expect(result.endDate).toBe('2026-01-29');
			});

			it('should work at end of day', () => {
				vi.useFakeTimers();
				vi.setSystemTime(new Date('2026-01-29T23:59:59Z'));

				const result = getDateRangeForQuickFilter('today');

				expect(result.startDate).toBe('2026-01-29');
				expect(result.endDate).toBe('2026-01-29');
			});
		});

		describe('tomorrow filter', () => {
			it('should return tomorrow for start and end date', () => {
				vi.useFakeTimers();
				vi.setSystemTime(new Date('2026-01-29T14:30:00Z'));

				const result = getDateRangeForQuickFilter('tomorrow');

				expect(result.startDate).toBe('2026-01-30');
				expect(result.endDate).toBe('2026-01-30');
			});

			it('should handle month boundaries', () => {
				vi.useFakeTimers();
				vi.setSystemTime(new Date('2026-01-31T14:30:00Z')); // Last day of January

				const result = getDateRangeForQuickFilter('tomorrow');

				expect(result.startDate).toBe('2026-02-01');
				expect(result.endDate).toBe('2026-02-01');
			});

			it('should handle year boundaries', () => {
				vi.useFakeTimers();
				vi.setSystemTime(new Date('2026-12-31T14:30:00Z')); // Last day of year

				const result = getDateRangeForQuickFilter('tomorrow');

				expect(result.startDate).toBe('2027-01-01');
				expect(result.endDate).toBe('2027-01-01');
			});
		});

		describe('this-weekend filter', () => {
			it('should return Friday-Sunday when today is Monday', () => {
				vi.useFakeTimers();
				vi.setSystemTime(new Date('2026-01-26T14:30:00Z')); // Monday

				const result = getDateRangeForQuickFilter('this-weekend');

				expect(result.startDate).toBe('2026-01-30'); // Friday
				expect(result.endDate).toBe('2026-02-01'); // Sunday
			});

			it('should return Friday-Sunday when today is Tuesday', () => {
				vi.useFakeTimers();
				vi.setSystemTime(new Date('2026-01-27T14:30:00Z')); // Tuesday

				const result = getDateRangeForQuickFilter('this-weekend');

				expect(result.startDate).toBe('2026-01-30'); // Friday
				expect(result.endDate).toBe('2026-02-01'); // Sunday
			});

			it('should return Friday-Sunday when today is Wednesday', () => {
				vi.useFakeTimers();
				vi.setSystemTime(new Date('2026-01-28T14:30:00Z')); // Wednesday

				const result = getDateRangeForQuickFilter('this-weekend');

				expect(result.startDate).toBe('2026-01-30'); // Friday
				expect(result.endDate).toBe('2026-02-01'); // Sunday
			});

			it('should return Friday-Sunday when today is Thursday', () => {
				vi.useFakeTimers();
				vi.setSystemTime(new Date('2026-01-29T14:30:00Z')); // Thursday

				const result = getDateRangeForQuickFilter('this-weekend');

				expect(result.startDate).toBe('2026-01-30'); // Friday
				expect(result.endDate).toBe('2026-02-01'); // Sunday
			});

			it('should return Friday-Sunday when today is Friday', () => {
				vi.useFakeTimers();
				vi.setSystemTime(new Date('2026-01-30T14:30:00Z')); // Friday

				const result = getDateRangeForQuickFilter('this-weekend');

				expect(result.startDate).toBe('2026-01-30'); // Friday (today)
				expect(result.endDate).toBe('2026-02-01'); // Sunday
			});

			it('should return Friday-Sunday when today is Saturday', () => {
				vi.useFakeTimers();
				vi.setSystemTime(new Date('2026-01-31T14:30:00Z')); // Saturday

				const result = getDateRangeForQuickFilter('this-weekend');

				expect(result.startDate).toBe('2026-01-30'); // Friday (yesterday)
				expect(result.endDate).toBe('2026-02-01'); // Sunday
			});

			it('should return Friday-Sunday when today is Sunday', () => {
				vi.useFakeTimers();
				vi.setSystemTime(new Date('2026-02-01T14:30:00Z')); // Sunday

				const result = getDateRangeForQuickFilter('this-weekend');

				expect(result.startDate).toBe('2026-01-30'); // Friday
				expect(result.endDate).toBe('2026-02-01'); // Sunday (today)
			});
		});

		describe('this-week filter', () => {
			it('should return Monday-Sunday when today is Monday', () => {
				vi.useFakeTimers();
				vi.setSystemTime(new Date('2026-01-26T14:30:00Z')); // Monday

				const result = getDateRangeForQuickFilter('this-week');

				expect(result.startDate).toBe('2026-01-26'); // Monday (today)
				expect(result.endDate).toBe('2026-02-01'); // Sunday
			});

			it('should return Monday-Sunday when today is Wednesday', () => {
				vi.useFakeTimers();
				vi.setSystemTime(new Date('2026-01-28T14:30:00Z')); // Wednesday

				const result = getDateRangeForQuickFilter('this-week');

				expect(result.startDate).toBe('2026-01-26'); // Monday
				expect(result.endDate).toBe('2026-02-01'); // Sunday
			});

			it('should return Monday-Sunday when today is Friday', () => {
				vi.useFakeTimers();
				vi.setSystemTime(new Date('2026-01-30T14:30:00Z')); // Friday

				const result = getDateRangeForQuickFilter('this-week');

				expect(result.startDate).toBe('2026-01-26'); // Monday
				expect(result.endDate).toBe('2026-02-01'); // Sunday
			});

			it('should return Monday-Sunday when today is Sunday', () => {
				vi.useFakeTimers();
				vi.setSystemTime(new Date('2026-02-01T14:30:00Z')); // Sunday

				const result = getDateRangeForQuickFilter('this-week');

				expect(result.startDate).toBe('2026-01-26'); // Monday
				expect(result.endDate).toBe('2026-02-01'); // Sunday (today)
			});

			it('should handle week crossing month boundaries', () => {
				vi.useFakeTimers();
				vi.setSystemTime(new Date('2026-02-04T14:30:00Z')); // Wednesday, Feb 4

				const result = getDateRangeForQuickFilter('this-week');

				expect(result.startDate).toBe('2026-02-02'); // Monday, Feb 2
				expect(result.endDate).toBe('2026-02-08'); // Sunday, Feb 8
			});
		});
	});

	describe('getQuickFilterLabel', () => {
		it('should return correct label for today', () => {
			expect(getQuickFilterLabel('today')).toBe('Today');
		});

		it('should return correct label for tomorrow', () => {
			expect(getQuickFilterLabel('tomorrow')).toBe('Tomorrow');
		});

		it('should return correct label for this-weekend', () => {
			expect(getQuickFilterLabel('this-weekend')).toBe('This Weekend');
		});

		it('should return correct label for this-week', () => {
			expect(getQuickFilterLabel('this-week')).toBe('This Week');
		});
	});

	describe('isQuickFilterActive', () => {
		beforeEach(() => {
			vi.useFakeTimers();
			vi.setSystemTime(new Date('2026-01-28T14:30:00Z')); // Wednesday
		});

		it('should return true when dates match today filter', () => {
			const result = isQuickFilterActive('today', '2026-01-28', '2026-01-28');
			expect(result).toBe(true);
		});

		it('should return false when dates do not match today filter', () => {
			const result = isQuickFilterActive('today', '2026-01-29', '2026-01-29');
			expect(result).toBe(false);
		});

		it('should return true when dates match tomorrow filter', () => {
			const result = isQuickFilterActive('tomorrow', '2026-01-29', '2026-01-29');
			expect(result).toBe(true);
		});

		it('should return true when dates match this-weekend filter', () => {
			const result = isQuickFilterActive('this-weekend', '2026-01-30', '2026-02-01');
			expect(result).toBe(true);
		});

		it('should return true when dates match this-week filter', () => {
			const result = isQuickFilterActive('this-week', '2026-01-26', '2026-02-01');
			expect(result).toBe(true);
		});

		it('should return false when start date is null', () => {
			const result = isQuickFilterActive('today', null, '2026-01-28');
			expect(result).toBe(false);
		});

		it('should return false when end date is null', () => {
			const result = isQuickFilterActive('today', '2026-01-28', null);
			expect(result).toBe(false);
		});

		it('should return false when both dates are null', () => {
			const result = isQuickFilterActive('today', null, null);
			expect(result).toBe(false);
		});

		it('should return false when start date matches but end date does not', () => {
			const result = isQuickFilterActive('today', '2026-01-28', '2026-01-29');
			expect(result).toBe(false);
		});

		it('should return false when end date matches but start date does not', () => {
			const result = isQuickFilterActive('today', '2026-01-27', '2026-01-28');
			expect(result).toBe(false);
		});
	});
});
