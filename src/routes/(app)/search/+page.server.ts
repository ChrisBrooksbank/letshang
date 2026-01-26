// Search page server
// Handles search requests for events and groups

import { search } from '$lib/server/search';
import { searchQuerySchema } from '$lib/schemas/search';
import type { PageServerLoad } from './$types';

export const load = (async ({ url, locals }) => {
	const session = locals.session;
	const userId = session?.user?.id || null;

	// Get query param
	const rawQuery = url.searchParams.get('q') || '';

	// Validate query
	const validation = searchQuerySchema.safeParse({
		query: rawQuery,
		type: 'all'
	});

	// If no query or invalid, return empty results
	if (!validation.success || !rawQuery.trim()) {
		return {
			query: rawQuery,
			results: {
				events: [],
				groups: [],
				eventsCount: 0,
				groupsCount: 0
			},
			error: null
		};
	}

	try {
		// Perform search
		const results = await search(rawQuery, userId);

		return {
			query: rawQuery,
			results,
			error: null
		};
	} catch {
		// Return error message to user without exposing internal details
		return {
			query: rawQuery,
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
