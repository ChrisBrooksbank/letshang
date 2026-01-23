import { describe, it, expect } from 'vitest';
import { eventCreationSchema, eventTypeEnum } from './events';

describe('eventTypeEnum', () => {
	it('should accept valid event types', () => {
		expect(eventTypeEnum.parse('in_person')).toBe('in_person');
		expect(eventTypeEnum.parse('online')).toBe('online');
		expect(eventTypeEnum.parse('hybrid')).toBe('hybrid');
	});

	it('should reject invalid event types', () => {
		expect(() => eventTypeEnum.parse('invalid')).toThrow();
		expect(() => eventTypeEnum.parse('')).toThrow();
		expect(() => eventTypeEnum.parse('In-Person')).toThrow();
	});
});

describe('eventCreationSchema', () => {
	// Helper to create a valid base event
	const createValidEvent = (): {
		title: string;
		description: string;
		eventType: 'online' | 'in_person' | 'hybrid';
		startTime: string;
		durationMinutes?: number;
		endTime?: string;
		venueName?: string;
		venueAddress?: string;
		groupId?: string | null;
	} => ({
		title: 'Test Event',
		description: 'A test event description',
		eventType: 'online' as const,
		startTime: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
		durationMinutes: 60
	});

	describe('title validation', () => {
		it('should accept valid titles', () => {
			const event = createValidEvent();
			event.title = 'Valid';
			expect(() => eventCreationSchema.parse(event)).not.toThrow();

			event.title = 'A'.repeat(100);
			expect(() => eventCreationSchema.parse(event)).not.toThrow();
		});

		it('should reject titles that are too short', () => {
			const event = createValidEvent();
			event.title = 'Four';
			expect(() => eventCreationSchema.parse(event)).toThrow('Title must be at least 5 characters');
		});

		it('should reject titles that are too long', () => {
			const event = createValidEvent();
			event.title = 'A'.repeat(101);
			expect(() => eventCreationSchema.parse(event)).toThrow(
				'Title must not exceed 100 characters'
			);
		});

		it('should trim whitespace from title', () => {
			const event = createValidEvent();
			event.title = '  Valid Title  ';
			const result = eventCreationSchema.parse(event);
			expect(result.title).toBe('Valid Title');
		});

		it('should reject empty title after trimming', () => {
			const event = createValidEvent();
			event.title = '     ';
			expect(() => eventCreationSchema.parse(event)).toThrow();
		});
	});

	describe('description validation', () => {
		it('should accept valid descriptions', () => {
			const event = createValidEvent();
			event.description = 'A valid description';
			expect(() => eventCreationSchema.parse(event)).not.toThrow();
		});

		it('should accept descriptions up to 5000 characters', () => {
			const event = createValidEvent();
			event.description = 'A'.repeat(5000);
			expect(() => eventCreationSchema.parse(event)).not.toThrow();
		});

		it('should reject descriptions over 5000 characters', () => {
			const event = createValidEvent();
			event.description = 'A'.repeat(5001);
			expect(() => eventCreationSchema.parse(event)).toThrow(
				'Description must not exceed 5000 characters'
			);
		});

		it('should default to empty string when description is omitted', () => {
			const event = createValidEvent();
			delete (event as { description?: string }).description;
			const result = eventCreationSchema.parse(event);
			expect(result.description).toBe('');
		});

		it('should trim whitespace from description', () => {
			const event = createValidEvent();
			event.description = '  Description  ';
			const result = eventCreationSchema.parse(event);
			expect(result.description).toBe('Description');
		});
	});

	describe('eventType validation', () => {
		it('should accept all valid event types', () => {
			const event = createValidEvent();

			event.eventType = 'in_person';
			event.venueName = 'Test Venue';
			event.venueAddress = '123 Test St';
			expect(() => eventCreationSchema.parse(event)).not.toThrow();

			event.eventType = 'online';
			expect(() => eventCreationSchema.parse(event)).not.toThrow();

			event.eventType = 'hybrid';
			expect(() => eventCreationSchema.parse(event)).not.toThrow();
		});

		it('should reject invalid event types', () => {
			const event = createValidEvent();
			(event as { eventType: string }).eventType = 'invalid';
			expect(() => eventCreationSchema.parse(event)).toThrow();
		});
	});

	describe('startTime validation', () => {
		it('should accept valid future date-time strings', () => {
			const event = createValidEvent();
			event.startTime = new Date(Date.now() + 86400000).toISOString();
			expect(() => eventCreationSchema.parse(event)).not.toThrow();
		});

		it('should reject past date-time strings', () => {
			const event = createValidEvent();
			event.startTime = new Date(Date.now() - 86400000).toISOString();
			expect(() => eventCreationSchema.parse(event)).toThrow(
				'Event start time must be in the future'
			);
		});

		it('should reject invalid date-time strings', () => {
			const event = createValidEvent();
			event.startTime = 'invalid-date';
			expect(() => eventCreationSchema.parse(event)).toThrow('Please enter a valid date and time');
		});

		it('should reject non-ISO 8601 date formats', () => {
			const event = createValidEvent();
			event.startTime = '2024-12-31'; // Missing time component
			expect(() => eventCreationSchema.parse(event)).toThrow('Please enter a valid date and time');
		});
	});

	describe('endTime validation', () => {
		it('should accept valid end time after start time', () => {
			const event = createValidEvent();
			event.startTime = new Date(Date.now() + 86400000).toISOString();
			event.endTime = new Date(Date.now() + 86400000 + 3600000).toISOString(); // 1 hour later
			delete (event as { durationMinutes?: number }).durationMinutes;
			expect(() => eventCreationSchema.parse(event)).not.toThrow();
		});

		it('should reject end time before start time', () => {
			const event = createValidEvent();
			event.startTime = new Date(Date.now() + 86400000).toISOString();
			event.endTime = new Date(Date.now() + 86400000 - 3600000).toISOString(); // 1 hour earlier
			expect(() => eventCreationSchema.parse(event)).toThrow('End time must be after start time');
		});

		it('should reject end time equal to start time', () => {
			const event = createValidEvent();
			const sameTime = new Date(Date.now() + 86400000).toISOString();
			event.startTime = sameTime;
			event.endTime = sameTime;
			expect(() => eventCreationSchema.parse(event)).toThrow('End time must be after start time');
		});

		it('should be optional when durationMinutes is provided', () => {
			const event = createValidEvent();
			expect(() => eventCreationSchema.parse(event)).not.toThrow();
		});

		it('should reject invalid end time format', () => {
			const event = createValidEvent();
			event.endTime = 'invalid-date';
			expect(() => eventCreationSchema.parse(event)).toThrow('Please enter a valid date and time');
		});
	});

	describe('durationMinutes validation', () => {
		it('should accept valid durations', () => {
			const event = createValidEvent();
			event.durationMinutes = 15;
			expect(() => eventCreationSchema.parse(event)).not.toThrow();

			event.durationMinutes = 60;
			expect(() => eventCreationSchema.parse(event)).not.toThrow();

			event.durationMinutes = 240;
			expect(() => eventCreationSchema.parse(event)).not.toThrow();
		});

		it('should reject durations less than 15 minutes', () => {
			const event = createValidEvent();
			event.durationMinutes = 14;
			expect(() => eventCreationSchema.parse(event)).toThrow(
				'Duration must be at least 15 minutes'
			);
		});

		it('should reject non-integer durations', () => {
			const event = createValidEvent();
			event.durationMinutes = 30.5;
			expect(() => eventCreationSchema.parse(event)).toThrow();
		});

		it('should be optional when endTime is provided', () => {
			const event = createValidEvent();
			delete (event as { durationMinutes?: number }).durationMinutes;
			event.endTime = new Date(Date.now() + 86400000 + 3600000).toISOString();
			expect(() => eventCreationSchema.parse(event)).not.toThrow();
		});

		it('should reject when neither endTime nor durationMinutes is provided', () => {
			const event = createValidEvent();
			delete (event as { durationMinutes?: number }).durationMinutes;
			expect(() => eventCreationSchema.parse(event)).toThrow(
				'Either end time or duration must be provided'
			);
		});
	});

	describe('venue validation for in-person events', () => {
		it('should require venueName for in-person events', () => {
			const event = createValidEvent();
			event.eventType = 'in_person';
			event.venueAddress = '123 Test St';
			expect(() => eventCreationSchema.parse(event)).toThrow(
				'Venue name is required for in-person and hybrid events'
			);
		});

		it('should require venueAddress for in-person events', () => {
			const event = createValidEvent();
			event.eventType = 'in_person';
			event.venueName = 'Test Venue';
			expect(() => eventCreationSchema.parse(event)).toThrow(
				'Venue address is required for in-person and hybrid events'
			);
		});

		it('should accept valid venue information for in-person events', () => {
			const event = createValidEvent();
			event.eventType = 'in_person';
			event.venueName = 'Test Venue';
			event.venueAddress = '123 Test St, City, State';
			expect(() => eventCreationSchema.parse(event)).not.toThrow();
		});

		it('should trim venue fields', () => {
			const event = createValidEvent();
			event.eventType = 'in_person';
			event.venueName = '  Test Venue  ';
			event.venueAddress = '  123 Test St  ';
			const result = eventCreationSchema.parse(event);
			expect(result.venueName).toBe('Test Venue');
			expect(result.venueAddress).toBe('123 Test St');
		});

		it('should reject empty venue name after trimming for in-person events', () => {
			const event = createValidEvent();
			event.eventType = 'in_person';
			event.venueName = '     ';
			event.venueAddress = '123 Test St';
			expect(() => eventCreationSchema.parse(event)).toThrow(
				'Venue name is required for in-person and hybrid events'
			);
		});
	});

	describe('venue validation for hybrid events', () => {
		it('should require venueName for hybrid events', () => {
			const event = createValidEvent();
			event.eventType = 'hybrid';
			event.venueAddress = '123 Test St';
			expect(() => eventCreationSchema.parse(event)).toThrow(
				'Venue name is required for in-person and hybrid events'
			);
		});

		it('should require venueAddress for hybrid events', () => {
			const event = createValidEvent();
			event.eventType = 'hybrid';
			event.venueName = 'Test Venue';
			expect(() => eventCreationSchema.parse(event)).toThrow(
				'Venue address is required for in-person and hybrid events'
			);
		});

		it('should accept valid venue information for hybrid events', () => {
			const event = createValidEvent();
			event.eventType = 'hybrid';
			event.venueName = 'Test Venue';
			event.venueAddress = '123 Test St, City, State';
			expect(() => eventCreationSchema.parse(event)).not.toThrow();
		});
	});

	describe('venue validation for online events', () => {
		it('should not require venue information for online events', () => {
			const event = createValidEvent();
			event.eventType = 'online';
			expect(() => eventCreationSchema.parse(event)).not.toThrow();
		});

		it('should accept optional venue information for online events', () => {
			const event = createValidEvent();
			event.eventType = 'online';
			event.venueName = 'Optional Venue';
			event.venueAddress = 'Optional Address';
			expect(() => eventCreationSchema.parse(event)).not.toThrow();
		});
	});

	describe('complex validation scenarios', () => {
		it('should handle all valid fields together', () => {
			const event = {
				title: 'Complete Event',
				description: 'A complete test event with all fields',
				eventType: 'hybrid' as const,
				startTime: new Date(Date.now() + 86400000).toISOString(),
				endTime: new Date(Date.now() + 86400000 + 7200000).toISOString(),
				venueName: 'Test Venue',
				venueAddress: '123 Test St, City, State 12345'
			};
			expect(() => eventCreationSchema.parse(event)).not.toThrow();
		});

		it('should handle minimal valid online event', () => {
			const event = {
				title: 'Minimal Event',
				eventType: 'online' as const,
				startTime: new Date(Date.now() + 86400000).toISOString(),
				durationMinutes: 30
			};
			expect(() => eventCreationSchema.parse(event)).not.toThrow();
		});
	});

	describe('groupId validation', () => {
		it('should accept valid UUID for groupId', () => {
			const event = createValidEvent();
			event.groupId = '550e8400-e29b-41d4-a716-446655440000';
			expect(() => eventCreationSchema.parse(event)).not.toThrow();
		});

		it('should accept null for groupId (standalone event)', () => {
			const event = createValidEvent();
			event.groupId = null;
			expect(() => eventCreationSchema.parse(event)).not.toThrow();
		});

		it('should accept undefined for groupId (standalone event)', () => {
			const event = createValidEvent();
			// groupId is not set (undefined)
			expect(() => eventCreationSchema.parse(event)).not.toThrow();
		});

		it('should reject invalid UUID for groupId', () => {
			const event = createValidEvent();
			event.groupId = 'not-a-uuid';
			expect(() => eventCreationSchema.parse(event)).toThrow('Invalid group ID');
		});

		it('should reject empty string for groupId', () => {
			const event = createValidEvent();
			event.groupId = '';
			expect(() => eventCreationSchema.parse(event)).toThrow();
		});
	});
});
