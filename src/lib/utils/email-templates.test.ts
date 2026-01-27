/**
 * Tests for Email Templates
 */

import { describe, it, expect } from 'vitest';
import {
	generateEventReminderEmail,
	generateRsvpConfirmationEmail,
	generateWaitlistPromotionEmail,
	generateNewEventInGroupEmail,
	generateGroupAnnouncementEmail,
	generateEventUpdateEmail,
	generateNewMessageEmail,
	generateNotificationEmail,
	type EventReminderEmailData,
	type RsvpConfirmationEmailData,
	type WaitlistPromotionEmailData,
	type NewEventInGroupEmailData,
	type GroupAnnouncementEmailData,
	type EventUpdateEmailData,
	type NewMessageEmailData
} from './email-templates';

describe('Email Templates', () => {
	const baseData = {
		recipientName: 'Jane Doe',
		unsubscribeUrl: 'https://example.com/settings'
	};

	describe('generateEventReminderEmail', () => {
		it('should generate 7-day reminder email', () => {
			const data: EventReminderEmailData = {
				...baseData,
				eventTitle: 'Tech Meetup',
				eventStart: '2026-02-10T19:00:00Z',
				eventEnd: '2026-02-10T21:00:00Z',
				eventType: 'in_person',
				venueName: 'Tech Hub',
				venueAddress: '123 Main St',
				eventUrl: 'https://example.com/events/123',
				reminderType: '7_days'
			};

			const result = generateEventReminderEmail(data);

			expect(result.subject).toContain('Coming up in 7 days');
			expect(result.subject).toContain('Tech Meetup');
			expect(result.html).toContain('Jane Doe');
			expect(result.html).toContain('Tech Meetup');
			expect(result.html).toContain('Tech Hub');
			expect(result.html).toContain('123 Main St');
			expect(result.html).toContain('https://example.com/events/123');
			expect(result.html).toContain('https://example.com/settings');
		});

		it('should generate 2-day reminder email', () => {
			const data: EventReminderEmailData = {
				...baseData,
				eventTitle: 'Workshop',
				eventStart: '2026-02-05T10:00:00Z',
				eventEnd: '2026-02-05T12:00:00Z',
				eventType: 'online',
				videoLink: 'https://zoom.us/j/123',
				eventUrl: 'https://example.com/events/456',
				reminderType: '2_days'
			};

			const result = generateEventReminderEmail(data);

			expect(result.subject).toContain('Coming up in 2 days');
			expect(result.html).toContain('Online Event');
		});

		it('should generate day-of reminder email', () => {
			const data: EventReminderEmailData = {
				...baseData,
				eventTitle: 'Networking',
				eventStart: '2026-02-03T18:00:00Z',
				eventEnd: '2026-02-03T20:00:00Z',
				eventType: 'hybrid',
				venueName: 'Cafe',
				videoLink: 'https://meet.google.com/abc',
				eventUrl: 'https://example.com/events/789',
				reminderType: 'day_of'
			};

			const result = generateEventReminderEmail(data);

			expect(result.subject).toContain('Happening today');
			expect(result.html).toContain('Hybrid Event');
		});

		it('should escape HTML in event title', () => {
			const data: EventReminderEmailData = {
				...baseData,
				eventTitle: '<script>alert("xss")</script>',
				eventStart: '2026-02-10T19:00:00Z',
				eventEnd: '2026-02-10T21:00:00Z',
				eventType: 'in_person',
				eventUrl: 'https://example.com/events/123',
				reminderType: '7_days'
			};

			const result = generateEventReminderEmail(data);

			expect(result.html).not.toContain('<script>');
			expect(result.html).toContain('&lt;script&gt;');
		});
	});

	describe('generateRsvpConfirmationEmail', () => {
		it('should generate "going" confirmation email', () => {
			const data: RsvpConfirmationEmailData = {
				...baseData,
				eventTitle: 'Yoga Class',
				eventStart: '2026-02-15T09:00:00Z',
				eventType: 'in_person',
				venueName: 'Studio A',
				eventUrl: 'https://example.com/events/yoga',
				rsvpStatus: 'going'
			};

			const result = generateRsvpConfirmationEmail(data);

			expect(result.subject).toContain('RSVP Confirmed');
			expect(result.html).toContain("You're going!");
			expect(result.html).toContain('confirmed your attendance');
			expect(result.html).toContain('Yoga Class');
			expect(result.html).toContain('Studio A');
		});

		it('should generate "interested" confirmation email', () => {
			const data: RsvpConfirmationEmailData = {
				...baseData,
				eventTitle: 'Book Club',
				eventStart: '2026-02-20T19:00:00Z',
				eventType: 'online',
				eventUrl: 'https://example.com/events/book',
				rsvpStatus: 'interested'
			};

			const result = generateRsvpConfirmationEmail(data);

			expect(result.html).toContain("You're interested!");
			expect(result.html).toContain('marked you as interested');
			expect(result.html).toContain('Online Event');
		});
	});

	describe('generateWaitlistPromotionEmail', () => {
		it('should generate waitlist promotion email', () => {
			const data: WaitlistPromotionEmailData = {
				...baseData,
				eventTitle: 'Popular Workshop',
				eventStart: '2026-03-01T14:00:00Z',
				eventUrl: 'https://example.com/events/popular'
			};

			const result = generateWaitlistPromotionEmail(data);

			expect(result.subject).toContain("You're in!");
			expect(result.html).toContain('spot just opened up');
			expect(result.html).toContain('Popular Workshop');
			expect(result.html).toContain('upgraded to "Going"');
		});
	});

	describe('generateNewEventInGroupEmail', () => {
		it('should generate new event in group email', () => {
			const data: NewEventInGroupEmailData = {
				...baseData,
				groupName: 'Runners Club',
				eventTitle: '5K Morning Run',
				eventStart: '2026-02-12T07:00:00Z',
				eventUrl: 'https://example.com/events/run',
				groupUrl: 'https://example.com/groups/runners'
			};

			const result = generateNewEventInGroupEmail(data);

			expect(result.subject).toContain('New Event');
			expect(result.html).toContain('Runners Club');
			expect(result.html).toContain('5K Morning Run');
			expect(result.html).toContain('View Event & RSVP');
		});
	});

	describe('generateGroupAnnouncementEmail', () => {
		it('should generate group announcement email', () => {
			const data: GroupAnnouncementEmailData = {
				...baseData,
				groupName: 'Photography Club',
				announcementTitle: 'New Meeting Location',
				announcementBody: 'Starting next month, we will meet at the new downtown studio.',
				groupUrl: 'https://example.com/groups/photo'
			};

			const result = generateGroupAnnouncementEmail(data);

			expect(result.subject).toContain('Photography Club');
			expect(result.subject).toContain('New Meeting Location');
			expect(result.html).toContain('Announcement from Photography Club');
			expect(result.html).toContain('new downtown studio');
		});

		it('should escape HTML in announcement body', () => {
			const data: GroupAnnouncementEmailData = {
				...baseData,
				groupName: 'Test Group',
				announcementTitle: 'Test',
				announcementBody: '<b>Bold text</b>',
				groupUrl: 'https://example.com/groups/test'
			};

			const result = generateGroupAnnouncementEmail(data);

			expect(result.html).not.toContain('<b>');
			expect(result.html).toContain('&lt;b&gt;');
		});
	});

	describe('generateEventUpdateEmail', () => {
		it('should generate event update email', () => {
			const data: EventUpdateEmailData = {
				...baseData,
				eventTitle: 'Hiking Trip',
				updateType: 'update',
				updateMessage: 'Meeting time changed to 8am instead of 9am',
				eventUrl: 'https://example.com/events/hike'
			};

			const result = generateEventUpdateEmail(data);

			expect(result.subject).toContain('Event Updated');
			expect(result.html).toContain('event you RSVPed to has been updated');
			expect(result.html).toContain('Meeting time changed');
			expect(result.html).toContain('RSVP is still active');
		});

		it('should generate event cancellation email', () => {
			const data: EventUpdateEmailData = {
				...baseData,
				eventTitle: 'Beach Volleyball',
				updateType: 'cancellation',
				updateMessage: 'Due to bad weather, this event is cancelled.',
				eventUrl: 'https://example.com/events/volleyball'
			};

			const result = generateEventUpdateEmail(data);

			expect(result.subject).toContain('Event Cancelled');
			expect(result.html).toContain('event you RSVPed to has been cancelled');
			expect(result.html).toContain('bad weather');
			expect(result.html).toContain('Sorry for any inconvenience');
		});
	});

	describe('generateNewMessageEmail', () => {
		it('should generate new message email', () => {
			const data: NewMessageEmailData = {
				...baseData,
				senderName: 'John Smith',
				messagePreview: 'Hey, are you still coming to the event tomorrow?',
				messageUrl: 'https://example.com/messages/123'
			};

			const result = generateNewMessageEmail(data);

			expect(result.subject).toContain('New message from John Smith');
			expect(result.html).toContain('John Smith sent you a message');
			expect(result.html).toContain('are you still coming');
			expect(result.html).toContain('Read & Reply');
		});

		it('should escape HTML in message preview', () => {
			const data: NewMessageEmailData = {
				...baseData,
				senderName: 'Alice',
				messagePreview: '<img src="x" onerror="alert(1)">',
				messageUrl: 'https://example.com/messages/456'
			};

			const result = generateNewMessageEmail(data);

			expect(result.html).not.toContain('<img');
			expect(result.html).toContain('&lt;img');
		});
	});

	describe('generateNotificationEmail', () => {
		it('should generate event reminder email via dispatcher', () => {
			const data: EventReminderEmailData = {
				...baseData,
				eventTitle: 'Test Event',
				eventStart: '2026-02-10T19:00:00Z',
				eventEnd: '2026-02-10T21:00:00Z',
				eventType: 'in_person',
				eventUrl: 'https://example.com/events/123',
				reminderType: '7_days'
			};

			const result = generateNotificationEmail('event_reminder', data);

			expect(result).not.toBeNull();
			expect(result?.subject).toContain('Coming up in 7 days');
		});

		it('should generate RSVP confirmation email via dispatcher', () => {
			const data: RsvpConfirmationEmailData = {
				...baseData,
				eventTitle: 'Test Event',
				eventStart: '2026-02-10T19:00:00Z',
				eventType: 'in_person',
				eventUrl: 'https://example.com/events/123',
				rsvpStatus: 'going'
			};

			const result = generateNotificationEmail('rsvp_confirmation', data);

			expect(result).not.toBeNull();
			expect(result?.subject).toContain('RSVP Confirmed');
		});

		it('should generate waitlist promotion email via dispatcher', () => {
			const data: WaitlistPromotionEmailData = {
				...baseData,
				eventTitle: 'Test Event',
				eventStart: '2026-02-10T19:00:00Z',
				eventUrl: 'https://example.com/events/123'
			};

			const result = generateNotificationEmail('waitlist_promotion', data);

			expect(result).not.toBeNull();
			expect(result?.subject).toContain("You're in!");
		});

		it('should generate new event in group email via dispatcher', () => {
			const data: NewEventInGroupEmailData = {
				...baseData,
				groupName: 'Test Group',
				eventTitle: 'Test Event',
				eventStart: '2026-02-10T19:00:00Z',
				eventUrl: 'https://example.com/events/123',
				groupUrl: 'https://example.com/groups/456'
			};

			const result = generateNotificationEmail('new_event_in_group', data);

			expect(result).not.toBeNull();
			expect(result?.subject).toContain('New Event');
		});

		it('should generate group announcement email via dispatcher', () => {
			const data: GroupAnnouncementEmailData = {
				...baseData,
				groupName: 'Test Group',
				announcementTitle: 'Test Announcement',
				announcementBody: 'Test body',
				groupUrl: 'https://example.com/groups/456'
			};

			const result = generateNotificationEmail('group_announcement', data);

			expect(result).not.toBeNull();
			expect(result?.subject).toContain('Test Group');
		});

		it('should generate event update email via dispatcher', () => {
			const data: EventUpdateEmailData = {
				...baseData,
				eventTitle: 'Test Event',
				updateType: 'update',
				updateMessage: 'Test update',
				eventUrl: 'https://example.com/events/123'
			};

			const result = generateNotificationEmail('event_update_cancellation', data);

			expect(result).not.toBeNull();
			expect(result?.subject).toContain('Event Updated');
		});

		it('should generate new message email via dispatcher', () => {
			const data: NewMessageEmailData = {
				...baseData,
				senderName: 'Test Sender',
				messagePreview: 'Test message',
				messageUrl: 'https://example.com/messages/123'
			};

			const result = generateNotificationEmail('new_message', data);

			expect(result).not.toBeNull();
			expect(result?.subject).toContain('New message');
		});

		it('should return null for unknown notification type', () => {
			const result = generateNotificationEmail('unknown_type' as never, {});

			expect(result).toBeNull();
		});
	});

	describe('Common requirements', () => {
		it('should include unsubscribe link in all emails', () => {
			const templates = [
				generateEventReminderEmail({
					...baseData,
					eventTitle: 'Test',
					eventStart: '2026-02-10T19:00:00Z',
					eventEnd: '2026-02-10T21:00:00Z',
					eventType: 'in_person',
					eventUrl: 'https://example.com/events/1',
					reminderType: '7_days'
				}),
				generateRsvpConfirmationEmail({
					...baseData,
					eventTitle: 'Test',
					eventStart: '2026-02-10T19:00:00Z',
					eventType: 'in_person',
					eventUrl: 'https://example.com/events/1',
					rsvpStatus: 'going'
				}),
				generateWaitlistPromotionEmail({
					...baseData,
					eventTitle: 'Test',
					eventStart: '2026-02-10T19:00:00Z',
					eventUrl: 'https://example.com/events/1'
				}),
				generateNewEventInGroupEmail({
					...baseData,
					groupName: 'Test',
					eventTitle: 'Test',
					eventStart: '2026-02-10T19:00:00Z',
					eventUrl: 'https://example.com/events/1',
					groupUrl: 'https://example.com/groups/1'
				}),
				generateGroupAnnouncementEmail({
					...baseData,
					groupName: 'Test',
					announcementTitle: 'Test',
					announcementBody: 'Test',
					groupUrl: 'https://example.com/groups/1'
				}),
				generateEventUpdateEmail({
					...baseData,
					eventTitle: 'Test',
					updateType: 'update',
					updateMessage: 'Test',
					eventUrl: 'https://example.com/events/1'
				}),
				generateNewMessageEmail({
					...baseData,
					senderName: 'Test',
					messagePreview: 'Test',
					messageUrl: 'https://example.com/messages/1'
				})
			];

			templates.forEach((template) => {
				expect(template.html).toContain('https://example.com/settings');
				expect(template.html).toContain('notification preferences');
			});
		});

		it('should include LetsHang branding in all emails', () => {
			const template = generateEventReminderEmail({
				...baseData,
				eventTitle: 'Test',
				eventStart: '2026-02-10T19:00:00Z',
				eventEnd: '2026-02-10T21:00:00Z',
				eventType: 'in_person',
				eventUrl: 'https://example.com/events/1',
				reminderType: '7_days'
			});

			expect(template.html).toContain('LetsHang');
			expect(template.html).toContain('&copy; 2026 LetsHang');
		});

		it('should be mobile-friendly with responsive meta tags', () => {
			const template = generateEventReminderEmail({
				...baseData,
				eventTitle: 'Test',
				eventStart: '2026-02-10T19:00:00Z',
				eventEnd: '2026-02-10T21:00:00Z',
				eventType: 'in_person',
				eventUrl: 'https://example.com/events/1',
				reminderType: '7_days'
			});

			expect(template.html).toContain('viewport');
			expect(template.html).toContain('max-width: 600px');
			expect(template.html).toContain('@media only screen and (max-width: 600px)');
		});
	});
});
