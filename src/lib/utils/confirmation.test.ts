/**
 * Tests for Confirmation Utilities
 */

import { describe, it, expect } from 'vitest';
import {
	getConfirmationStatusLabel,
	getConfirmationStatusColor,
	shouldShowConfirmation,
	getConfirmationMessage,
	formatConfirmationStats,
	calculateConfirmationResponseRate,
	getConfirmationEmoji
} from './confirmation';

describe('Confirmation Utilities', () => {
	describe('getConfirmationStatusLabel', () => {
		it('should return correct label for pending status', () => {
			expect(getConfirmationStatusLabel('pending')).toBe('Pending');
		});

		it('should return correct label for confirmed status', () => {
			expect(getConfirmationStatusLabel('confirmed')).toBe('Confirmed');
		});

		it('should return correct label for bailed_out status', () => {
			expect(getConfirmationStatusLabel('bailed_out')).toBe('Bailed Out');
		});
	});

	describe('getConfirmationStatusColor', () => {
		it('should return yellow colors for pending status', () => {
			const color = getConfirmationStatusColor('pending');
			expect(color).toContain('yellow');
		});

		it('should return green colors for confirmed status', () => {
			const color = getConfirmationStatusColor('confirmed');
			expect(color).toContain('green');
		});

		it('should return gray colors for bailed_out status', () => {
			const color = getConfirmationStatusColor('bailed_out');
			expect(color).toContain('gray');
		});
	});

	describe('shouldShowConfirmation', () => {
		it('should return true for events today that have not started', () => {
			const now = new Date();
			const futureToday = new Date(now);
			// Set to 23:59 today (end of day) to ensure it's definitely today and in the future
			futureToday.setHours(23, 59, 59, 999);

			expect(shouldShowConfirmation(futureToday)).toBe(true);
		});

		it('should return false for events in the past', () => {
			const now = new Date();
			const past = new Date(now);
			past.setHours(now.getHours() - 1);

			expect(shouldShowConfirmation(past)).toBe(false);
		});

		it('should return false for events tomorrow', () => {
			const now = new Date();
			const tomorrow = new Date(now);
			tomorrow.setDate(now.getDate() + 1);
			tomorrow.setHours(now.getHours() + 2);

			expect(shouldShowConfirmation(tomorrow)).toBe(false);
		});

		it('should return false for events yesterday', () => {
			const now = new Date();
			const yesterday = new Date(now);
			yesterday.setDate(now.getDate() - 1);

			expect(shouldShowConfirmation(yesterday)).toBe(false);
		});

		it('should handle ISO string input', () => {
			const now = new Date();
			const futureToday = new Date(now);
			// Set to 23:59 today (end of day) to ensure it's definitely today and in the future
			futureToday.setHours(23, 59, 59, 999);

			expect(shouldShowConfirmation(futureToday.toISOString())).toBe(true);
		});

		it('should return false for events that have already started today', () => {
			const now = new Date();
			const pastToday = new Date(now);
			pastToday.setHours(now.getHours() - 1);

			expect(shouldShowConfirmation(pastToday)).toBe(false);
		});
	});

	describe('getConfirmationMessage', () => {
		const eventTitle = 'Coffee Meetup';

		it('should return pending message', () => {
			const message = getConfirmationMessage('pending', eventTitle);
			expect(message).toContain(eventTitle);
			expect(message).toContain('still coming');
		});

		it('should return confirmed message', () => {
			const message = getConfirmationMessage('confirmed', eventTitle);
			expect(message).toContain(eventTitle);
			expect(message).toContain('see you');
		});

		it('should return bailed out message', () => {
			const message = getConfirmationMessage('bailed_out', eventTitle);
			expect(message).toContain('Thanks');
			expect(message).toContain('next event');
		});
	});

	describe('formatConfirmationStats', () => {
		it('should format stats with all statuses', () => {
			const stats = {
				total: 10,
				pending: 3,
				confirmed: 5,
				bailedOut: 2
			};

			const formatted = formatConfirmationStats(stats);
			expect(formatted).toContain('5 confirmed');
			expect(formatted).toContain('3 pending');
			expect(formatted).toContain('2 bailed out');
		});

		it('should handle zero total', () => {
			const stats = {
				total: 0,
				pending: 0,
				confirmed: 0,
				bailedOut: 0
			};

			expect(formatConfirmationStats(stats)).toBe('No confirmations yet');
		});

		it('should only show non-zero counts', () => {
			const stats = {
				total: 5,
				pending: 0,
				confirmed: 5,
				bailedOut: 0
			};

			const formatted = formatConfirmationStats(stats);
			expect(formatted).toBe('5 confirmed');
			expect(formatted).not.toContain('pending');
			expect(formatted).not.toContain('bailed');
		});

		it('should handle only pending', () => {
			const stats = {
				total: 3,
				pending: 3,
				confirmed: 0,
				bailedOut: 0
			};

			expect(formatConfirmationStats(stats)).toBe('3 pending');
		});

		it('should handle only bailed out', () => {
			const stats = {
				total: 2,
				pending: 0,
				confirmed: 0,
				bailedOut: 2
			};

			expect(formatConfirmationStats(stats)).toBe('2 bailed out');
		});
	});

	describe('calculateConfirmationResponseRate', () => {
		it('should calculate response rate correctly', () => {
			const stats = {
				total: 10,
				pending: 2,
				confirmed: 6,
				bailedOut: 2
			};

			// 8 responded out of 10 = 80%
			expect(calculateConfirmationResponseRate(stats)).toBe(80);
		});

		it('should return 0 for no responses', () => {
			const stats = {
				total: 5,
				pending: 5,
				confirmed: 0,
				bailedOut: 0
			};

			expect(calculateConfirmationResponseRate(stats)).toBe(0);
		});

		it('should return 100 for all responses', () => {
			const stats = {
				total: 8,
				pending: 0,
				confirmed: 5,
				bailedOut: 3
			};

			expect(calculateConfirmationResponseRate(stats)).toBe(100);
		});

		it('should return 0 for zero total', () => {
			const stats = {
				total: 0,
				pending: 0,
				confirmed: 0,
				bailedOut: 0
			};

			expect(calculateConfirmationResponseRate(stats)).toBe(0);
		});

		it('should round to nearest integer', () => {
			const stats = {
				total: 3,
				pending: 1,
				confirmed: 2,
				bailedOut: 0
			};

			// 2 responded out of 3 = 66.67% -> rounds to 67
			expect(calculateConfirmationResponseRate(stats)).toBe(67);
		});

		it('should handle 50% response rate', () => {
			const stats = {
				total: 10,
				pending: 5,
				confirmed: 3,
				bailedOut: 2
			};

			expect(calculateConfirmationResponseRate(stats)).toBe(50);
		});
	});

	describe('getConfirmationEmoji', () => {
		it('should return hourglass for pending', () => {
			expect(getConfirmationEmoji('pending')).toBe('⏳');
		});

		it('should return checkmark for confirmed', () => {
			expect(getConfirmationEmoji('confirmed')).toBe('✅');
		});

		it('should return X for bailed_out', () => {
			expect(getConfirmationEmoji('bailed_out')).toBe('❌');
		});
	});
});
