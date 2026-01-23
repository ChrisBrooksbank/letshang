import { z } from 'zod';

/**
 * Event type enum for validation
 * Must match the event_type enum in the database
 */
export const eventTypeEnum = z.enum(['in_person', 'online', 'hybrid']);

/**
 * Event visibility enum for validation
 * Must match the event_visibility enum in the database
 */
export const eventVisibilityEnum = z.enum(['public', 'group_only', 'hidden']);

/**
 * Event creation schema
 * Validates basic event creation form data
 */
export const eventCreationSchema = z
	.object({
		// Title: 5-100 characters
		title: z
			.string()
			.trim()
			.min(5, 'Title must be at least 5 characters')
			.max(100, 'Title must not exceed 100 characters'),

		// Description: up to 5000 characters (rich text will be stored as HTML string)
		description: z
			.string()
			.max(5000, 'Description must not exceed 5000 characters')
			.trim()
			.optional()
			.default(''),

		// Event type: in-person, online, or hybrid
		eventType: eventTypeEnum,

		// Start time: ISO 8601 date-time string
		startTime: z
			.string()
			.datetime({ message: 'Please enter a valid date and time' })
			.refine(
				(val) => {
					const startDate = new Date(val);
					const now = new Date();
					return startDate > now;
				},
				{ message: 'Event start time must be in the future' }
			),

		// End time: ISO 8601 date-time string
		endTime: z.string().datetime({ message: 'Please enter a valid date and time' }).optional(),

		// Duration in minutes (alternative to end time)
		durationMinutes: z.number().int().min(15, 'Duration must be at least 15 minutes').optional(),

		// Venue fields for in-person events
		venueName: z.string().max(200, 'Venue name must not exceed 200 characters').trim().optional(),

		venueAddress: z
			.string()
			.max(500, 'Venue address must not exceed 500 characters')
			.trim()
			.optional(),

		// Video link for online events (Zoom, Meet, etc.)
		videoLink: z
			.string()
			.url({ message: 'Please enter a valid URL' })
			.max(2000, 'Video link must not exceed 2000 characters')
			.trim()
			.optional(),

		// Optional group association
		groupId: z.string().uuid({ message: 'Invalid group ID' }).optional().nullable(),

		// Visibility: who can see this event
		visibility: eventVisibilityEnum.default('public')
	})
	.superRefine((data, ctx) => {
		// Validate that in-person events have venue information
		if (data.eventType === 'in_person' || data.eventType === 'hybrid') {
			if (!data.venueName || data.venueName.trim() === '') {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'Venue name is required for in-person and hybrid events',
					path: ['venueName']
				});
			}
			if (!data.venueAddress || data.venueAddress.trim() === '') {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'Venue address is required for in-person and hybrid events',
					path: ['venueAddress']
				});
			}
		}

		// Validate that online events have video link
		if (data.eventType === 'online' || data.eventType === 'hybrid') {
			if (!data.videoLink || data.videoLink.trim() === '') {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'Video link is required for online and hybrid events',
					path: ['videoLink']
				});
			}
		}

		// Validate end time is after start time if provided
		if (data.endTime) {
			const startDate = new Date(data.startTime);
			const endDate = new Date(data.endTime);
			if (endDate <= startDate) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'End time must be after start time',
					path: ['endTime']
				});
			}
		}

		// Validate that either endTime or durationMinutes is provided
		if (!data.endTime && !data.durationMinutes) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'Either end time or duration must be provided',
				path: ['endTime']
			});
		}

		// Validate that group_only events have a group_id
		if (data.visibility === 'group_only' && !data.groupId) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'Group-only events must be associated with a group',
				path: ['visibility']
			});
		}
	});
