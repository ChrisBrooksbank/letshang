// Search page server
// Handles search requests for events and groups with filtering

import { search } from '$lib/server/search';
import { searchWithFiltersSchema } from '$lib/schemas/search';
import type { PageServerLoad } from './$types';

export const load = (async ({ url, locals }) => {
	const session = locals.session;
	const userId = session?.user?.id || null;

	// Get query and filter params from URL
	const rawQuery = url.searchParams.get('q') || '';
	const eventType = url.searchParams.get('eventType') || undefined;
	const rawStartDate = url.searchParams.get('startDate') || undefined;
	const rawEndDate = url.searchParams.get('endDate') || undefined;
	const eventSize = url.searchParams.get('eventSize') || undefined;

	// Convert date inputs (YYYY-MM-DD) to ISO datetime format for validation
	// Start date: beginning of the day (00:00:00)
	const startDate = rawStartDate ? `${rawStartDate}T00:00:00.000Z` : undefined;
	// End date: end of the day (23:59:59)
	const endDate = rawEndDate ? `${rawEndDate}T23:59:59.999Z` : undefined;

	// Validate query and filters
	const validation = searchWithFiltersSchema.safeParse({
		query: rawQuery,
		type: 'all',
		eventType,
		startDate,
		endDate,
		eventSize
	});

	// If no query, return empty results
	if (!rawQuery.trim()) {
		return {
			query: rawQuery,
			filters: {
				eventType: eventType || null,
				startDate: rawStartDate || null,
				endDate: rawEndDate || null,
				eventSize: eventSize || null
			},
			results: {
				events: [],
				groups: [],
				eventsCount: 0,
				groupsCount: 0
			},
			error: null
		};
	}

	// If validation failed (invalid filters), return error
	if (!validation.success) {
		return {
			query: rawQuery,
			filters: {
				eventType: eventType || null,
				startDate: rawStartDate || null,
				endDate: rawEndDate || null,
				eventSize: eventSize || null
			},
			results: {
				events: [],
				groups: [],
				eventsCount: 0,
				groupsCount: 0
			},
			error: 'Invalid search parameters'
		};
	}

	try {
		// Extract validated filters
		const filters = {
			eventType: validation.data.eventType,
			startDate: validation.data.startDate,
			endDate: validation.data.endDate,
			eventSize: validation.data.eventSize
		};

		// Perform search with filters
		const results = await search(rawQuery, userId, filters);

		return {
			query: rawQuery,
			filters: {
				eventType: eventType || null,
				startDate: rawStartDate || null,
				endDate: rawEndDate || null,
				eventSize: eventSize || null
			},
			results,
			error: null
		};
	} catch {
		// Return error message to user without exposing internal details
		return {
			query: rawQuery,
			filters: {
				eventType: eventType || null,
				startDate: rawStartDate || null,
				endDate: rawEndDate || null,
				eventSize: eventSize || null
			},
			results: {
				events: [],
				groups: [],
				eventsCount: 0,
				groupsCount: 0
			},
			error: 'Failed to perform search. Please try again.'
		};
	}
}) satisfies PageServerLoad;
