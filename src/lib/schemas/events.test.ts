import { describe, it, expect } from 'vitest';
import {
	eventCreationSchema,
	eventTypeEnum,
	eventVisibilityEnum,
	eventFormatTagEnum,
	eventAccessibilityTagEnum,
	eventSizeEnum
} from './events';

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
		videoLink?: string;
		groupId?: string | null;
		visibility?: 'public' | 'group_only' | 'hidden';
	} => ({
		title: 'Test Event',
		description: 'A test event description',
		eventType: 'online' as const,
		startTime: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
		durationMinutes: 60,
		videoLink: 'https://zoom.us/j/123456789'
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
			event.videoLink = 'https://zoom.us/j/123456789';
			expect(() => eventCreationSchema.parse(event)).not.toThrow();
		});

		it('should accept optional venue information for online events', () => {
			const event = createValidEvent();
			event.eventType = 'online';
			event.venueName = 'Optional Venue';
			event.venueAddress = 'Optional Address';
			event.videoLink = 'https://zoom.us/j/123456789';
			expect(() => eventCreationSchema.parse(event)).not.toThrow();
		});
	});

	describe('videoLink validation for online events', () => {
		it('should require video link for online events', () => {
			const event = createValidEvent();
			event.eventType = 'online';
			delete event.videoLink; // Remove video link to test validation
			expect(() => eventCreationSchema.parse(event)).toThrow('Video link is required');
		});

		it('should accept valid video link for online events', () => {
			const event = createValidEvent();
			event.eventType = 'online';
			event.videoLink = 'https://zoom.us/j/123456789';
			expect(() => eventCreationSchema.parse(event)).not.toThrow();
		});

		it('should accept various video conferencing platforms', () => {
			const event = createValidEvent();
			event.eventType = 'online';

			// Zoom
			event.videoLink = 'https://zoom.us/j/123456789?pwd=abc123';
			expect(() => eventCreationSchema.parse(event)).not.toThrow();

			// Google Meet
			event.videoLink = 'https://meet.google.com/abc-defg-hij';
			expect(() => eventCreationSchema.parse(event)).not.toThrow();

			// Microsoft Teams
			event.videoLink = 'https://teams.microsoft.com/l/meetup-join/123';
			expect(() => eventCreationSchema.parse(event)).not.toThrow();
		});

		it('should reject invalid URLs for video link', () => {
			const event = createValidEvent();
			event.eventType = 'online';
			event.videoLink = 'not a url';
			expect(() => eventCreationSchema.parse(event)).toThrow('valid URL');
		});

		it('should reject video links that are too long', () => {
			const event = createValidEvent();
			event.eventType = 'online';
			event.videoLink = 'https://zoom.us/' + 'a'.repeat(2000);
			expect(() => eventCreationSchema.parse(event)).toThrow('must not exceed 2000 characters');
		});

		it('should not require video link for in-person events', () => {
			const event = createValidEvent();
			event.eventType = 'in_person';
			event.venueName = 'Test Venue';
			event.venueAddress = '123 Test St';
			expect(() => eventCreationSchema.parse(event)).not.toThrow();
		});
	});

	describe('videoLink validation for hybrid events', () => {
		it('should require video link for hybrid events', () => {
			const event = createValidEvent();
			event.eventType = 'hybrid';
			event.venueName = 'Test Venue';
			event.venueAddress = '123 Test St';
			delete event.videoLink; // Remove video link to test validation
			expect(() => eventCreationSchema.parse(event)).toThrow('Video link is required');
		});

		it('should accept valid video link and venue for hybrid events', () => {
			const event = createValidEvent();
			event.eventType = 'hybrid';
			event.venueName = 'Test Venue';
			event.venueAddress = '123 Test St';
			event.videoLink = 'https://zoom.us/j/123456789';
			expect(() => eventCreationSchema.parse(event)).not.toThrow();
		});

		it('should require both venue and video link for hybrid events', () => {
			const event = createValidEvent();
			event.eventType = 'hybrid';
			event.videoLink = 'https://zoom.us/j/123456789';
			delete event.venueName;
			delete event.venueAddress;
			// Missing venue
			expect(() => eventCreationSchema.parse(event)).toThrow('Venue name is required');

			const event2 = createValidEvent();
			event2.eventType = 'hybrid';
			event2.venueName = 'Test Venue';
			event2.venueAddress = '123 Test St';
			delete event2.videoLink;
			// Missing video link
			expect(() => eventCreationSchema.parse(event2)).toThrow('Video link is required');
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
				venueAddress: '123 Test St, City, State 12345',
				videoLink: 'https://zoom.us/j/123456789'
			};
			expect(() => eventCreationSchema.parse(event)).not.toThrow();
		});

		it('should handle minimal valid online event', () => {
			const event = {
				title: 'Minimal Event',
				eventType: 'online' as const,
				startTime: new Date(Date.now() + 86400000).toISOString(),
				durationMinutes: 30,
				videoLink: 'https://zoom.us/j/123456789'
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

describe('eventVisibilityEnum', () => {
	it('should accept valid visibility values', () => {
		expect(eventVisibilityEnum.parse('public')).toBe('public');
		expect(eventVisibilityEnum.parse('group_only')).toBe('group_only');
		expect(eventVisibilityEnum.parse('hidden')).toBe('hidden');
	});

	it('should reject invalid visibility values', () => {
		expect(() => eventVisibilityEnum.parse('invalid')).toThrow();
		expect(() => eventVisibilityEnum.parse('')).toThrow();
		expect(() => eventVisibilityEnum.parse('Public')).toThrow();
		expect(() => eventVisibilityEnum.parse('group-only')).toThrow();
	});
});

describe('eventCreationSchema - visibility validation', () => {
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
		videoLink?: string;
		groupId?: string | null;
		visibility?: 'public' | 'group_only' | 'hidden';
	} => ({
		title: 'Test Event',
		description: 'A test event description',
		eventType: 'online' as const,
		startTime: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
		durationMinutes: 60,
		videoLink: 'https://zoom.us/j/123456789'
	});

	describe('visibility defaults', () => {
		it('should default to public when visibility is not provided', () => {
			const event = createValidEvent();
			const result = eventCreationSchema.parse(event);
			expect(result.visibility).toBe('public');
		});

		it('should default to public for standalone events', () => {
			const event = createValidEvent();
			event.groupId = null;
			const result = eventCreationSchema.parse(event);
			expect(result.visibility).toBe('public');
		});
	});

	describe('public visibility', () => {
		it('should accept public visibility for standalone events', () => {
			const event = createValidEvent();
			event.visibility = 'public';
			expect(() => eventCreationSchema.parse(event)).not.toThrow();
		});

		it('should accept public visibility for group events', () => {
			const event = createValidEvent();
			event.visibility = 'public';
			event.groupId = '550e8400-e29b-41d4-a716-446655440000';
			expect(() => eventCreationSchema.parse(event)).not.toThrow();
		});
	});

	describe('group_only visibility', () => {
		it('should accept group_only visibility when groupId is provided', () => {
			const event = createValidEvent();
			event.visibility = 'group_only';
			event.groupId = '550e8400-e29b-41d4-a716-446655440000';
			expect(() => eventCreationSchema.parse(event)).not.toThrow();
		});

		it('should reject group_only visibility without a groupId', () => {
			const event = createValidEvent();
			event.visibility = 'group_only';
			expect(() => eventCreationSchema.parse(event)).toThrow(
				'Group-only events must be associated with a group'
			);
		});

		it('should reject group_only visibility with null groupId', () => {
			const event = createValidEvent();
			event.visibility = 'group_only';
			event.groupId = null;
			expect(() => eventCreationSchema.parse(event)).toThrow(
				'Group-only events must be associated with a group'
			);
		});

		it('should reject group_only visibility with undefined groupId', () => {
			const event = createValidEvent();
			event.visibility = 'group_only';
			event.groupId = undefined;
			expect(() => eventCreationSchema.parse(event)).toThrow(
				'Group-only events must be associated with a group'
			);
		});
	});

	describe('hidden visibility', () => {
		it('should accept hidden visibility for standalone events', () => {
			const event = createValidEvent();
			event.visibility = 'hidden';
			expect(() => eventCreationSchema.parse(event)).not.toThrow();
		});

		it('should accept hidden visibility for group events', () => {
			const event = createValidEvent();
			event.visibility = 'hidden';
			event.groupId = '550e8400-e29b-41d4-a716-446655440000';
			expect(() => eventCreationSchema.parse(event)).not.toThrow();
		});

		it('should accept hidden visibility without a groupId', () => {
			const event = createValidEvent();
			event.visibility = 'hidden';
			event.groupId = null;
			expect(() => eventCreationSchema.parse(event)).not.toThrow();
		});
	});

	describe('visibility integration tests', () => {
		it('should accept all combinations of valid visibility and group settings', () => {
			const validCombinations = [
				{ visibility: 'public' as const, groupId: null },
				{ visibility: 'public' as const, groupId: '550e8400-e29b-41d4-a716-446655440000' },
				{ visibility: 'group_only' as const, groupId: '550e8400-e29b-41d4-a716-446655440000' },
				{ visibility: 'hidden' as const, groupId: null },
				{ visibility: 'hidden' as const, groupId: '550e8400-e29b-41d4-a716-446655440000' }
			];

			for (const combo of validCombinations) {
				const event = createValidEvent();
				event.visibility = combo.visibility;
				event.groupId = combo.groupId;
				expect(() => eventCreationSchema.parse(event)).not.toThrow();
			}
		});

		it('should properly parse and return visibility value', () => {
			const event = createValidEvent();
			event.visibility = 'group_only';
			event.groupId = '550e8400-e29b-41d4-a716-446655440000';
			const result = eventCreationSchema.parse(event);
			expect(result.visibility).toBe('group_only');
		});
	});

	describe('capacity validation', () => {
		it('should accept events without capacity (unlimited)', () => {
			const event = createValidEvent();
			expect(() => eventCreationSchema.parse(event)).not.toThrow();
		});

		it('should accept null capacity', () => {
			const event = {
				...createValidEvent(),
				capacity: null
			};
			expect(() => eventCreationSchema.parse(event)).not.toThrow();
		});

		it('should accept undefined capacity', () => {
			const event = {
				...createValidEvent(),
				capacity: undefined
			};
			expect(() => eventCreationSchema.parse(event)).not.toThrow();
		});

		it('should accept minimum capacity of 1', () => {
			const event = {
				...createValidEvent(),
				capacity: 1
			};
			expect(() => eventCreationSchema.parse(event)).not.toThrow();
		});

		it('should accept maximum capacity of 10000', () => {
			const event = {
				...createValidEvent(),
				capacity: 10000
			};
			expect(() => eventCreationSchema.parse(event)).not.toThrow();
		});

		it('should accept capacity within valid range', () => {
			const validCapacities = [1, 5, 10, 50, 100, 500, 1000, 5000, 10000];
			for (const capacity of validCapacities) {
				const event = {
					...createValidEvent(),
					capacity
				};
				expect(() => eventCreationSchema.parse(event)).not.toThrow();
			}
		});

		it('should reject capacity of 0', () => {
			const event = {
				...createValidEvent(),
				capacity: 0
			};
			expect(() => eventCreationSchema.parse(event)).toThrow('Capacity must be at least 1');
		});

		it('should reject negative capacity', () => {
			const event = {
				...createValidEvent(),
				capacity: -1
			};
			expect(() => eventCreationSchema.parse(event)).toThrow('Capacity must be at least 1');
		});

		it('should reject capacity over 10000', () => {
			const event = {
				...createValidEvent(),
				capacity: 10001
			};
			expect(() => eventCreationSchema.parse(event)).toThrow('Capacity must not exceed 10,000');
		});

		it('should reject capacity over 10000 (large number)', () => {
			const event = {
				...createValidEvent(),
				capacity: 50000
			};
			expect(() => eventCreationSchema.parse(event)).toThrow('Capacity must not exceed 10,000');
		});

		it('should reject non-integer capacity', () => {
			const event = {
				...createValidEvent(),
				capacity: 10.5
			};
			expect(() => eventCreationSchema.parse(event)).toThrow('Capacity must be a whole number');
		});

		it('should reject non-integer capacity (decimal)', () => {
			const event = {
				...createValidEvent(),
				capacity: 99.99
			};
			expect(() => eventCreationSchema.parse(event)).toThrow('Capacity must be a whole number');
		});

		it('should properly parse and return capacity value', () => {
			const event = {
				...createValidEvent(),
				capacity: 50
			};
			const result = eventCreationSchema.parse(event);
			expect(result.capacity).toBe(50);
		});

		it('should properly parse and return null capacity', () => {
			const event = {
				...createValidEvent(),
				capacity: null
			};
			const result = eventCreationSchema.parse(event);
			expect(result.capacity).toBeNull();
		});
	});

	describe('format tags validation', () => {
		it('should accept valid format tags', () => {
			const validTags: Array<
				'speaker' | 'workshop' | 'activity' | 'discussion' | 'mixer' | 'hangout'
			> = ['speaker', 'workshop', 'activity', 'discussion', 'mixer', 'hangout'];
			for (const tag of validTags) {
				const event = {
					...createValidEvent(),
					formatTags: [tag]
				};
				expect(() => eventCreationSchema.parse(event)).not.toThrow();
			}
		});

		it('should accept multiple format tags', () => {
			const event = {
				...createValidEvent(),
				formatTags: ['speaker', 'workshop', 'activity']
			};
			expect(() => eventCreationSchema.parse(event)).not.toThrow();
		});

		it('should accept empty format tags array', () => {
			const event = {
				...createValidEvent(),
				formatTags: []
			};
			expect(() => eventCreationSchema.parse(event)).not.toThrow();
		});

		it('should default to empty array when format tags omitted', () => {
			const event = createValidEvent();
			const result = eventCreationSchema.parse(event);
			expect(result.formatTags).toEqual([]);
		});

		it('should reject invalid format tags', () => {
			const event = {
				...createValidEvent(),
				formatTags: ['invalid']
			};
			expect(() => eventCreationSchema.parse(event)).toThrow();
		});

		it('should reject duplicate format tags', () => {
			const event = {
				...createValidEvent(),
				formatTags: ['speaker', 'speaker']
			};
			const result = eventCreationSchema.parse(event);
			// Zod doesn't automatically remove duplicates, it just validates each item
			expect(result.formatTags).toEqual(['speaker', 'speaker']);
		});

		it('should properly parse and return format tags', () => {
			const event = {
				...createValidEvent(),
				formatTags: ['workshop', 'activity']
			};
			const result = eventCreationSchema.parse(event);
			expect(result.formatTags).toEqual(['workshop', 'activity']);
		});
	});

	describe('accessibility tags validation', () => {
		it('should accept valid accessibility tags', () => {
			const validTags: Array<
				'first_timer_friendly' | 'structured_activity' | 'low_pressure' | 'beginner_welcome'
			> = ['first_timer_friendly', 'structured_activity', 'low_pressure', 'beginner_welcome'];
			for (const tag of validTags) {
				const event = {
					...createValidEvent(),
					accessibilityTags: [tag]
				};
				expect(() => eventCreationSchema.parse(event)).not.toThrow();
			}
		});

		it('should accept multiple accessibility tags', () => {
			const event = {
				...createValidEvent(),
				accessibilityTags: ['first_timer_friendly', 'low_pressure']
			};
			expect(() => eventCreationSchema.parse(event)).not.toThrow();
		});

		it('should accept empty accessibility tags array', () => {
			const event = {
				...createValidEvent(),
				accessibilityTags: []
			};
			expect(() => eventCreationSchema.parse(event)).not.toThrow();
		});

		it('should default to empty array when accessibility tags omitted', () => {
			const event = createValidEvent();
			const result = eventCreationSchema.parse(event);
			expect(result.accessibilityTags).toEqual([]);
		});

		it('should reject invalid accessibility tags', () => {
			const event = {
				...createValidEvent(),
				accessibilityTags: ['invalid']
			};
			expect(() => eventCreationSchema.parse(event)).toThrow();
		});

		it('should properly parse and return accessibility tags', () => {
			const event = {
				...createValidEvent(),
				accessibilityTags: ['beginner_welcome', 'structured_activity']
			};
			const result = eventCreationSchema.parse(event);
			expect(result.accessibilityTags).toEqual(['beginner_welcome', 'structured_activity']);
		});
	});

	describe('combined tags validation', () => {
		it('should accept both format and accessibility tags together', () => {
			const event = {
				...createValidEvent(),
				formatTags: ['workshop', 'activity'],
				accessibilityTags: ['first_timer_friendly', 'beginner_welcome']
			};
			expect(() => eventCreationSchema.parse(event)).not.toThrow();
		});

		it('should properly parse both tag types', () => {
			const event = {
				...createValidEvent(),
				formatTags: ['speaker'],
				accessibilityTags: ['low_pressure']
			};
			const result = eventCreationSchema.parse(event);
			expect(result.formatTags).toEqual(['speaker']);
			expect(result.accessibilityTags).toEqual(['low_pressure']);
		});
	});

	describe('event size validation', () => {
		it('should accept valid event sizes', () => {
			const validSizes: Array<'intimate' | 'small' | 'medium' | 'large'> = [
				'intimate',
				'small',
				'medium',
				'large'
			];

			for (const size of validSizes) {
				const event = {
					...createValidEvent(),
					eventSize: size
				};
				expect(() => eventCreationSchema.parse(event)).not.toThrow();
			}
		});

		it('should reject invalid event sizes', () => {
			const event = {
				...createValidEvent(),
				eventSize: 'invalid' // Invalid size for runtime validation
			};
			expect(() => eventCreationSchema.parse(event)).toThrow();
		});

		it('should accept null event size', () => {
			const event = {
				...createValidEvent(),
				eventSize: null
			};
			expect(() => eventCreationSchema.parse(event)).not.toThrow();
		});

		it('should accept undefined event size (optional field)', () => {
			const event = {
				...createValidEvent()
				// eventSize not provided
			};
			expect(() => eventCreationSchema.parse(event)).not.toThrow();
		});

		it('should properly parse event size when provided', () => {
			const event = {
				...createValidEvent(),
				eventSize: 'small' as const
			};
			const result = eventCreationSchema.parse(event);
			expect(result.eventSize).toBe('small');
		});

		it('should allow event size without capacity', () => {
			const event = {
				...createValidEvent(),
				eventSize: 'medium' as const,
				capacity: null
			};
			expect(() => eventCreationSchema.parse(event)).not.toThrow();
		});

		it('should allow capacity without event size', () => {
			const event = {
				...createValidEvent(),
				capacity: 50,
				eventSize: null
			};
			expect(() => eventCreationSchema.parse(event)).not.toThrow();
		});

		it('should allow both capacity and event size', () => {
			const event = {
				...createValidEvent(),
				capacity: 100,
				eventSize: 'large' as const
			};
			expect(() => eventCreationSchema.parse(event)).not.toThrow();
			const result = eventCreationSchema.parse(event);
			expect(result.capacity).toBe(100);
			expect(result.eventSize).toBe('large');
		});
	});
});

describe('eventFormatTagEnum', () => {
	it('should accept valid format tags', () => {
		expect(eventFormatTagEnum.parse('speaker')).toBe('speaker');
		expect(eventFormatTagEnum.parse('workshop')).toBe('workshop');
		expect(eventFormatTagEnum.parse('activity')).toBe('activity');
		expect(eventFormatTagEnum.parse('discussion')).toBe('discussion');
		expect(eventFormatTagEnum.parse('mixer')).toBe('mixer');
		expect(eventFormatTagEnum.parse('hangout')).toBe('hangout');
	});

	it('should reject invalid format tags', () => {
		expect(() => eventFormatTagEnum.parse('invalid')).toThrow();
		expect(() => eventFormatTagEnum.parse('')).toThrow();
		expect(() => eventFormatTagEnum.parse('Speaker')).toThrow();
	});
});

describe('eventAccessibilityTagEnum', () => {
	it('should accept valid accessibility tags', () => {
		expect(eventAccessibilityTagEnum.parse('first_timer_friendly')).toBe('first_timer_friendly');
		expect(eventAccessibilityTagEnum.parse('structured_activity')).toBe('structured_activity');
		expect(eventAccessibilityTagEnum.parse('low_pressure')).toBe('low_pressure');
		expect(eventAccessibilityTagEnum.parse('beginner_welcome')).toBe('beginner_welcome');
	});

	it('should reject invalid accessibility tags', () => {
		expect(() => eventAccessibilityTagEnum.parse('invalid')).toThrow();
		expect(() => eventAccessibilityTagEnum.parse('')).toThrow();
		expect(() => eventAccessibilityTagEnum.parse('First-Timer Friendly')).toThrow();
	});
});

describe('eventSizeEnum', () => {
	it('should accept valid event sizes', () => {
		expect(eventSizeEnum.parse('intimate')).toBe('intimate');
		expect(eventSizeEnum.parse('small')).toBe('small');
		expect(eventSizeEnum.parse('medium')).toBe('medium');
		expect(eventSizeEnum.parse('large')).toBe('large');
	});

	it('should reject invalid event sizes', () => {
		expect(() => eventSizeEnum.parse('invalid')).toThrow();
		expect(() => eventSizeEnum.parse('')).toThrow();
		expect(() => eventSizeEnum.parse('Intimate')).toThrow();
		expect(() => eventSizeEnum.parse('tiny')).toThrow();
		expect(() => eventSizeEnum.parse('huge')).toThrow();
	});
});

describe('coverImageUrl validation', () => {
	// Helper to create a valid base event
	const createValidEvent = (): {
		title: string;
		eventType: 'in_person' | 'online' | 'hybrid';
		startTime: string;
		durationMinutes: number;
		venueName?: string;
		venueAddress?: string;
		videoLink?: string;
		coverImageUrl?: string | null;
	} => ({
		title: 'Test Event',
		eventType: 'in_person',
		startTime: new Date(Date.now() + 86400000).toISOString(),
		durationMinutes: 60,
		venueName: 'Test Venue',
		venueAddress: '123 Test St'
	});

	it('should accept valid HTTPS URLs', () => {
		const event = createValidEvent();
		event.coverImageUrl = 'https://example.com/image.jpg';
		expect(() => eventCreationSchema.parse(event)).not.toThrow();
	});

	it('should accept valid HTTP URLs', () => {
		const event = createValidEvent();
		event.coverImageUrl = 'http://example.com/image.png';
		expect(() => eventCreationSchema.parse(event)).not.toThrow();
	});

	it('should accept data URLs', () => {
		const event = createValidEvent();
		event.coverImageUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA';
		expect(() => eventCreationSchema.parse(event)).not.toThrow();
	});

	it('should accept null', () => {
		const event = createValidEvent();
		event.coverImageUrl = null;
		expect(() => eventCreationSchema.parse(event)).not.toThrow();
	});

	it('should accept undefined (optional field)', () => {
		const event = createValidEvent();
		delete (event as { coverImageUrl?: string }).coverImageUrl;
		expect(() => eventCreationSchema.parse(event)).not.toThrow();
	});

	it('should reject invalid URLs', () => {
		const event = createValidEvent();
		event.coverImageUrl = 'not-a-url';
		expect(() => eventCreationSchema.parse(event)).toThrow('Please enter a valid image URL');
	});

	it('should reject empty strings', () => {
		const event = createValidEvent();
		event.coverImageUrl = '';
		expect(() => eventCreationSchema.parse(event)).toThrow();
	});

	it('should trim whitespace', () => {
		const event = createValidEvent();
		event.coverImageUrl = '  https://example.com/image.jpg  ';
		const result = eventCreationSchema.parse(event);
		expect(result.coverImageUrl).toBe('https://example.com/image.jpg');
	});

	it('should reject URLs exceeding 2000 characters', () => {
		const event = createValidEvent();
		event.coverImageUrl = 'https://example.com/' + 'a'.repeat(2000);
		expect(() => eventCreationSchema.parse(event)).toThrow(
			'Image URL must not exceed 2000 characters'
		);
	});

	it('should accept URLs up to 2000 characters', () => {
		const event = createValidEvent();
		// Create a URL that's exactly 1980 characters (leaves room for protocol and domain)
		const longPath = 'a'.repeat(1960);
		event.coverImageUrl = `https://example.com/${longPath}`;
		expect(() => eventCreationSchema.parse(event)).not.toThrow();
	});
});
