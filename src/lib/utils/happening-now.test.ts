import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { isEventHappeningNow, canJoinLate, minutesUntilEnd } from './happening-now';

describe('Happening Now Utils', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('isEventHappeningNow', () => {
		it('should return true when event is in progress', () => {
			// Current time: 2026-01-27 15:00:00
			vi.setSystemTime(new Date('2026-01-27T15:00:00Z'));

			// Event: 14:30 - 16:00 (started 30 min ago, ends in 1 hour)
			const event = {
				start_time: '2026-01-27T14:30:00Z',
				end_time: '2026-01-27T16:00:00Z'
			};

			expect(isEventHappeningNow(event.start_time, event.end_time)).toBe(true);
		});

		it('should return false when event has not started yet', () => {
			vi.setSystemTime(new Date('2026-01-27T15:00:00Z'));

			// Event: 16:00 - 17:00 (starts in 1 hour)
			const event = {
				start_time: '2026-01-27T16:00:00Z',
				end_time: '2026-01-27T17:00:00Z'
			};

			expect(isEventHappeningNow(event.start_time, event.end_time)).toBe(false);
		});

		it('should return false when event has already ended', () => {
			vi.setSystemTime(new Date('2026-01-27T15:00:00Z'));

			// Event: 13:00 - 14:00 (ended 1 hour ago)
			const event = {
				start_time: '2026-01-27T13:00:00Z',
				end_time: '2026-01-27T14:00:00Z'
			};

			expect(isEventHappeningNow(event.start_time, event.end_time)).toBe(false);
		});

		it('should return true when event just started', () => {
			vi.setSystemTime(new Date('2026-01-27T15:00:00Z'));

			// Event: 15:00 - 16:00 (started exactly now)
			const event = {
				start_time: '2026-01-27T15:00:00Z',
				end_time: '2026-01-27T16:00:00Z'
			};

			expect(isEventHappeningNow(event.start_time, event.end_time)).toBe(true);
		});

		it('should return false when event just ended', () => {
			vi.setSystemTime(new Date('2026-01-27T15:00:00Z'));

			// Event: 14:00 - 15:00 (ended exactly now)
			const event = {
				start_time: '2026-01-27T14:00:00Z',
				end_time: '2026-01-27T15:00:00Z'
			};

			expect(isEventHappeningNow(event.start_time, event.end_time)).toBe(false);
		});

		it('should handle events without end time (null end time)', () => {
			vi.setSystemTime(new Date('2026-01-27T15:00:00Z'));

			// Event: 14:00 - null (started, no end time)
			const event = {
				start_time: '2026-01-27T14:00:00Z',
				end_time: null
			};

			// Without end time, assume event is not happening
			expect(isEventHappeningNow(event.start_time, event.end_time)).toBe(false);
		});
	});

	describe('canJoinLate', () => {
		it('should return true when event has at least 15 minutes remaining', () => {
			vi.setSystemTime(new Date('2026-01-27T15:00:00Z'));

			// Event: 14:30 - 15:20 (20 minutes remaining)
			const event = {
				start_time: '2026-01-27T14:30:00Z',
				end_time: '2026-01-27T15:20:00Z'
			};

			expect(canJoinLate(event.start_time, event.end_time)).toBe(true);
		});

		it('should return true when event has exactly 15 minutes remaining', () => {
			vi.setSystemTime(new Date('2026-01-27T15:00:00Z'));

			// Event: 14:30 - 15:15 (exactly 15 minutes remaining)
			const event = {
				start_time: '2026-01-27T14:30:00Z',
				end_time: '2026-01-27T15:15:00Z'
			};

			expect(canJoinLate(event.start_time, event.end_time)).toBe(true);
		});

		it('should return false when event has less than 15 minutes remaining', () => {
			vi.setSystemTime(new Date('2026-01-27T15:00:00Z'));

			// Event: 14:30 - 15:10 (10 minutes remaining)
			const event = {
				start_time: '2026-01-27T14:30:00Z',
				end_time: '2026-01-27T15:10:00Z'
			};

			expect(canJoinLate(event.start_time, event.end_time)).toBe(false);
		});

		it('should return false when event has not started yet', () => {
			vi.setSystemTime(new Date('2026-01-27T15:00:00Z'));

			// Event: 16:00 - 17:00 (not started)
			const event = {
				start_time: '2026-01-27T16:00:00Z',
				end_time: '2026-01-27T17:00:00Z'
			};

			expect(canJoinLate(event.start_time, event.end_time)).toBe(false);
		});

		it('should return false when event has ended', () => {
			vi.setSystemTime(new Date('2026-01-27T15:00:00Z'));

			// Event: 13:00 - 14:00 (ended)
			const event = {
				start_time: '2026-01-27T13:00:00Z',
				end_time: '2026-01-27T14:00:00Z'
			};

			expect(canJoinLate(event.start_time, event.end_time)).toBe(false);
		});

		it('should return false when end time is null', () => {
			vi.setSystemTime(new Date('2026-01-27T15:00:00Z'));

			const event = {
				start_time: '2026-01-27T14:00:00Z',
				end_time: null
			};

			expect(canJoinLate(event.start_time, event.end_time)).toBe(false);
		});
	});

	describe('minutesUntilEnd', () => {
		it('should return correct minutes remaining', () => {
			vi.setSystemTime(new Date('2026-01-27T15:00:00Z'));

			// Event ends in 45 minutes
			const event = {
				end_time: '2026-01-27T15:45:00Z'
			};

			expect(minutesUntilEnd(event.end_time)).toBe(45);
		});

		it('should return 0 when event has ended', () => {
			vi.setSystemTime(new Date('2026-01-27T15:00:00Z'));

			// Event ended 30 minutes ago
			const event = {
				end_time: '2026-01-27T14:30:00Z'
			};

			expect(minutesUntilEnd(event.end_time)).toBe(0);
		});

		it('should return 0 when end time is null', () => {
			const event = {
				end_time: null
			};

			expect(minutesUntilEnd(event.end_time)).toBe(0);
		});

		it('should handle fractional minutes (rounds down)', () => {
			vi.setSystemTime(new Date('2026-01-27T15:00:00Z'));

			// Event ends in 45.5 minutes
			const event = {
				end_time: '2026-01-27T15:45:30Z'
			};

			expect(minutesUntilEnd(event.end_time)).toBe(45);
		});

		it('should return large values for events far in future', () => {
			vi.setSystemTime(new Date('2026-01-27T15:00:00Z'));

			// Event ends in 2 hours (120 minutes)
			const event = {
				end_time: '2026-01-27T17:00:00Z'
			};

			expect(minutesUntilEnd(event.end_time)).toBe(120);
		});
	});
});
