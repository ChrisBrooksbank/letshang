/**
 * Tests for iCal utility functions
 */

import { describe, it, expect } from 'vitest';
import { generateICalEvent, generateICalFilename, type ICalEvent } from './ical';

describe('generateICalEvent', () => {
	it('should generate valid iCal content for minimal event', () => {
		const event: ICalEvent = {
			id: 'event-123',
			title: 'Test Event',
			description: null,
			startTime: '2026-02-01T19:00:00Z',
			endTime: null
		};

		const ical = generateICalEvent(event);

		expect(ical).toContain('BEGIN:VCALENDAR');
		expect(ical).toContain('VERSION:2.0');
		expect(ical).toContain('BEGIN:VEVENT');
		expect(ical).toContain('UID:event-123@letshang.app');
		expect(ical).toContain('DTSTART:20260201T190000Z');
		expect(ical).toContain('DTEND:20260201T190000Z');
		expect(ical).toContain('SUMMARY:Test Event');
		expect(ical).toContain('END:VEVENT');
		expect(ical).toContain('END:VCALENDAR');
	});

	it('should include end time when provided', () => {
		const event: ICalEvent = {
			id: 'event-123',
			title: 'Test Event',
			description: null,
			startTime: '2026-02-01T19:00:00Z',
			endTime: '2026-02-01T21:00:00Z'
		};

		const ical = generateICalEvent(event);

		expect(ical).toContain('DTSTART:20260201T190000Z');
		expect(ical).toContain('DTEND:20260201T210000Z');
	});

	it('should include description when provided', () => {
		const event: ICalEvent = {
			id: 'event-123',
			title: 'Test Event',
			description: 'This is a test event description',
			startTime: '2026-02-01T19:00:00Z',
			endTime: null
		};

		const ical = generateICalEvent(event);

		expect(ical).toContain('DESCRIPTION:This is a test event description');
	});

	it('should include location when provided', () => {
		const event: ICalEvent = {
			id: 'event-123',
			title: 'Test Event',
			description: null,
			startTime: '2026-02-01T19:00:00Z',
			endTime: null,
			location: '123 Main St, San Francisco, CA'
		};

		const ical = generateICalEvent(event);

		expect(ical).toContain('LOCATION:123 Main St\\, San Francisco\\, CA');
	});

	it('should include URL when provided', () => {
		const event: ICalEvent = {
			id: 'event-123',
			title: 'Test Event',
			description: null,
			startTime: '2026-02-01T19:00:00Z',
			endTime: null,
			url: 'https://letshang.app/events/event-123'
		};

		const ical = generateICalEvent(event);

		expect(ical).toContain('URL:https://letshang.app/events/event-123');
	});

	it('should include organizer with name only', () => {
		const event: ICalEvent = {
			id: 'event-123',
			title: 'Test Event',
			description: null,
			startTime: '2026-02-01T19:00:00Z',
			endTime: null,
			organizer: {
				name: 'John Doe'
			}
		};

		const ical = generateICalEvent(event);

		expect(ical).toContain('ORGANIZER:John Doe');
	});

	it('should include organizer with name and email', () => {
		const event: ICalEvent = {
			id: 'event-123',
			title: 'Test Event',
			description: null,
			startTime: '2026-02-01T19:00:00Z',
			endTime: null,
			organizer: {
				name: 'John Doe',
				email: 'john@example.com'
			}
		};

		const ical = generateICalEvent(event);

		expect(ical).toContain('ORGANIZER:CN=John Doe:mailto:john@example.com');
	});

	it('should escape special characters in title', () => {
		const event: ICalEvent = {
			id: 'event-123',
			title: 'Test; Event, with\\special chars\nand newlines',
			description: null,
			startTime: '2026-02-01T19:00:00Z',
			endTime: null
		};

		const ical = generateICalEvent(event);

		expect(ical).toContain('SUMMARY:Test\\; Event\\, with\\\\special chars\\nand newlines');
	});

	it('should escape special characters in description', () => {
		const event: ICalEvent = {
			id: 'event-123',
			title: 'Test Event',
			description: 'Line 1\nLine 2; with, special\\chars',
			startTime: '2026-02-01T19:00:00Z',
			endTime: null
		};

		const ical = generateICalEvent(event);

		expect(ical).toContain('DESCRIPTION:Line 1\\nLine 2\\; with\\, special\\\\chars');
	});

	it('should escape special characters in location', () => {
		const event: ICalEvent = {
			id: 'event-123',
			title: 'Test Event',
			description: null,
			startTime: '2026-02-01T19:00:00Z',
			endTime: null,
			location: 'Room A; Building B, 123\\Main St'
		};

		const ical = generateICalEvent(event);

		expect(ical).toContain('LOCATION:Room A\\; Building B\\, 123\\\\Main St');
	});

	it('should use CRLF line endings', () => {
		const event: ICalEvent = {
			id: 'event-123',
			title: 'Test Event',
			description: null,
			startTime: '2026-02-01T19:00:00Z',
			endTime: null
		};

		const ical = generateICalEvent(event);

		expect(ical).toContain('\r\n');
		expect(ical.split('\r\n').length).toBeGreaterThan(5);
	});

	it('should fold long lines at 75 characters', () => {
		const longTitle = 'A'.repeat(100);
		const event: ICalEvent = {
			id: 'event-123',
			title: longTitle,
			description: null,
			startTime: '2026-02-01T19:00:00Z',
			endTime: null
		};

		const ical = generateICalEvent(event);
		const lines = ical.split('\r\n');

		// Find the SUMMARY line
		const summaryLineIndex = lines.findIndex((line) => line.startsWith('SUMMARY:'));
		expect(summaryLineIndex).toBeGreaterThan(-1);

		// Check that the SUMMARY line is folded
		const summaryLine = lines[summaryLineIndex];
		expect(summaryLine.length).toBeLessThanOrEqual(75);

		// Check that the next line is a continuation (starts with space)
		const continuationLine = lines[summaryLineIndex + 1];
		expect(continuationLine).toMatch(/^ /);
	});

	it('should include required iCal fields', () => {
		const event: ICalEvent = {
			id: 'event-123',
			title: 'Test Event',
			description: null,
			startTime: '2026-02-01T19:00:00Z',
			endTime: null
		};

		const ical = generateICalEvent(event);

		expect(ical).toContain('PRODID:-//LetsHang//Event Calendar//EN');
		expect(ical).toContain('CALSCALE:GREGORIAN');
		expect(ical).toContain('METHOD:PUBLISH');
		expect(ical).toContain('DTSTAMP:');
		expect(ical).toContain('STATUS:CONFIRMED');
		expect(ical).toContain('SEQUENCE:0');
	});

	it('should handle event with all fields populated', () => {
		const event: ICalEvent = {
			id: 'event-123',
			title: 'Complete Test Event',
			description: 'A fully featured event with all fields',
			startTime: '2026-02-01T19:00:00Z',
			endTime: '2026-02-01T21:00:00Z',
			location: '123 Main St, San Francisco, CA',
			url: 'https://letshang.app/events/event-123',
			organizer: {
				name: 'Jane Smith',
				email: 'jane@example.com'
			}
		};

		const ical = generateICalEvent(event);

		expect(ical).toContain('BEGIN:VCALENDAR');
		expect(ical).toContain('UID:event-123@letshang.app');
		expect(ical).toContain('SUMMARY:Complete Test Event');
		expect(ical).toContain('DESCRIPTION:A fully featured event with all fields');
		expect(ical).toContain('DTSTART:20260201T190000Z');
		expect(ical).toContain('DTEND:20260201T210000Z');
		expect(ical).toContain('LOCATION:123 Main St\\, San Francisco\\, CA');
		expect(ical).toContain('URL:https://letshang.app/events/event-123');
		expect(ical).toContain('ORGANIZER:CN=Jane Smith:mailto:jane@example.com');
		expect(ical).toContain('END:VCALENDAR');
	});
});

describe('generateICalFilename', () => {
	it('should generate a valid filename from event title', () => {
		const filename = generateICalFilename('Tech Meetup 2026');
		expect(filename).toBe('tech-meetup-2026.ics');
	});

	it('should sanitize special characters', () => {
		const filename = generateICalFilename('Coffee & Coding @ 9:00 AM!');
		expect(filename).toBe('coffee-coding-9-00-am.ics');
	});

	it('should handle multiple spaces and hyphens', () => {
		const filename = generateICalFilename('Event   with    spaces---and-hyphens');
		expect(filename).toBe('event-with-spaces-and-hyphens.ics');
	});

	it('should truncate long titles to 50 characters', () => {
		const longTitle = 'A'.repeat(100);
		const filename = generateICalFilename(longTitle);
		expect(filename.length).toBe(54); // 50 chars + '.ics'
		expect(filename).toBe('a'.repeat(50) + '.ics');
	});

	it('should handle empty or whitespace-only titles', () => {
		expect(generateICalFilename('')).toBe('event.ics');
		expect(generateICalFilename('   ')).toBe('event.ics');
	});

	it('should handle titles with only special characters', () => {
		const filename = generateICalFilename('!@#$%^&*()');
		expect(filename).toBe('event.ics');
	});

	it('should remove leading and trailing hyphens', () => {
		const filename = generateICalFilename('---Event Name---');
		expect(filename).toBe('event-name.ics');
	});

	it('should handle Unicode characters', () => {
		const filename = generateICalFilename('Coffee ☕ Meeting 🎉');
		expect(filename).toBe('coffee-meeting.ics');
	});
});
