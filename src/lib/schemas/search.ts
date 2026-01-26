// Search schemas for validation
// Defines validation rules for search queries

import { z } from 'zod';

// Event type enum (matches database enum)
export const eventTypeEnum = z.enum(['in_person', 'online', 'hybrid']);

// Event size enum (matches database enum)
export const eventSizeEnum = z.enum(['intimate', 'small', 'medium', 'large']);

// Search query schema
export const searchQuerySchema = z.object({
	query: z
		.string()
		.trim()
		.min(1, 'Search query is required')
		.max(100, 'Search query must be 100 characters or less'),
	type: z.enum(['all', 'events', 'groups']).default('all')
});

// Search filters schema
export const searchFiltersSchema = z.object({
	// Event type filter
	eventType: eventTypeEnum.optional(),

	// Date range filter
	startDate: z
		.string()
		.datetime({ message: 'Start date must be a valid ISO 8601 datetime' })
		.optional(),
	endDate: z
		.string()
		.datetime({ message: 'End date must be a valid ISO 8601 datetime' })
		.optional(),

	// Event size filter
	eventSize: eventSizeEnum.optional()
});

// Combined search with filters schema
export const searchWithFiltersSchema = searchQuerySchema.merge(searchFiltersSchema);
