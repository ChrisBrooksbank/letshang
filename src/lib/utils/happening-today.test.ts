import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { minutesUntilStart, formatTimeUntilStart, isStartingSoon } from './happening-today';

describe('happening-today utilities', () => {
	beforeEach(() => {
		// Mock current time to 2026-01-27 12:00:00 UTC
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-01-27T12:00:00Z'));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('minutesUntilStart', () => {
		it('should return minutes until event starts', () => {
			const startTime = '2026-01-27T13:30:00Z'; // 1h 30m from now
			expect(minutesUntilStart(startTime)).toBe(90);
		});

		it('should return 0 for events that have already started', () => {
			const startTime = '2026-01-27T11:00:00Z'; // 1h ago
			expect(minutesUntilStart(startTime)).toBe(0);
		});

		it('should return 0 for events starting exactly now', () => {
			const startTime = '2026-01-27T12:00:00Z'; // Exactly now
			expect(minutesUntilStart(startTime)).toBe(0);
		});

		it('should handle events starting in less than 1 minute', () => {
			const startTime = '2026-01-27T12:00:30Z'; // 30 seconds from now
			expect(minutesUntilStart(startTime)).toBe(0); // Should round down
		});

		it('should handle events starting far in the future', () => {
			const startTime = '2026-01-27T20:00:00Z'; // 8 hours from now
			expect(minutesUntilStart(startTime)).toBe(480);
		});

		it('should handle events starting in exactly 1 hour', () => {
			const startTime = '2026-01-27T13:00:00Z';
			expect(minutesUntilStart(startTime)).toBe(60);
		});
	});

	describe('formatTimeUntilStart', () => {
		it('should format "Starting now" for events starting now', () => {
			const startTime = '2026-01-27T12:00:00Z';
			expect(formatTimeUntilStart(startTime)).toBe('Starting now');
		});

		it('should format "Starting now" for events that have started', () => {
			const startTime = '2026-01-27T11:30:00Z'; // 30 minutes ago
			expect(formatTimeUntilStart(startTime)).toBe('Starting now');
		});

		it('should format minutes only for events under 1 hour away', () => {
			const startTime = '2026-01-27T12:45:00Z'; // 45 minutes from now
			expect(formatTimeUntilStart(startTime)).toBe('in 45m');
		});

		it('should format hours only for events at exact hour intervals', () => {
			const startTime = '2026-01-27T15:00:00Z'; // 3 hours from now
			expect(formatTimeUntilStart(startTime)).toBe('in 3h');
		});

		it('should format hours and minutes for mixed intervals', () => {
			const startTime = '2026-01-27T13:30:00Z'; // 1h 30m from now
			expect(formatTimeUntilStart(startTime)).toBe('in 1h 30m');
		});

		it('should format 2h 15m correctly', () => {
			const startTime = '2026-01-27T14:15:00Z';
			expect(formatTimeUntilStart(startTime)).toBe('in 2h 15m');
		});

		it('should format exactly 1 hour', () => {
			const startTime = '2026-01-27T13:00:00Z';
			expect(formatTimeUntilStart(startTime)).toBe('in 1h');
		});

		it('should format exactly 1 minute', () => {
			const startTime = '2026-01-27T12:01:00Z';
			expect(formatTimeUntilStart(startTime)).toBe('in 1m');
		});
	});

	describe('isStartingSoon', () => {
		it('should return true for events starting within 2 hours', () => {
			const startTime = '2026-01-27T13:30:00Z'; // 1h 30m from now
			expect(isStartingSoon(startTime)).toBe(true);
		});

		it('should return true for events starting in exactly 2 hours', () => {
			const startTime = '2026-01-27T14:00:00Z';
			expect(isStartingSoon(startTime)).toBe(true);
		});

		it('should return true for events starting in 1 minute', () => {
			const startTime = '2026-01-27T12:01:00Z';
			expect(isStartingSoon(startTime)).toBe(true);
		});

		it('should return false for events starting in more than 2 hours', () => {
			const startTime = '2026-01-27T14:01:00Z'; // 2h 1m from now
			expect(isStartingSoon(startTime)).toBe(false);
		});

		it('should return false for events that have already started', () => {
			const startTime = '2026-01-27T11:00:00Z'; // 1h ago
			expect(isStartingSoon(startTime)).toBe(false);
		});

		it('should return false for events starting exactly now', () => {
			const startTime = '2026-01-27T12:00:00Z';
			expect(isStartingSoon(startTime)).toBe(false);
		});

		it('should return false for events starting in 3 hours', () => {
			const startTime = '2026-01-27T15:00:00Z';
			expect(isStartingSoon(startTime)).toBe(false);
		});

		it('should return true for events starting in 119 minutes', () => {
			const startTime = '2026-01-27T13:59:00Z';
			expect(isStartingSoon(startTime)).toBe(true);
		});

		it('should return true for events starting in 120 minutes exactly', () => {
			const startTime = '2026-01-27T14:00:00Z';
			expect(isStartingSoon(startTime)).toBe(true);
		});

		it('should return false for events starting in 121 minutes', () => {
			const startTime = '2026-01-27T14:01:00Z';
			expect(isStartingSoon(startTime)).toBe(false);
		});
	});
});
