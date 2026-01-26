// Search schemas for validation
// Defines validation rules for search queries

import { z } from 'zod';

// Search query schema
export const searchQuerySchema = z.object({
	query: z
		.string()
		.trim()
		.min(1, 'Search query is required')
		.max(100, 'Search query must be 100 characters or less'),
	type: z.enum(['all', 'events', 'groups']).default('all')
});
