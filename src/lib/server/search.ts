// Server-side search functionality
// Handles full-text search for events and groups

import { supabaseAdmin } from './supabase';

export interface SearchEventResult {
	id: string;
	title: string;
	description: string;
	event_type: string;
	start_time: string;
	venue_name: string | null;
	venue_address: string | null;
	capacity: number | null;
	cover_image_url: string | null;
	visibility: string;
	creator_id: string;
	group_id: string | null;
}

export interface SearchGroupResult {
	id: string;
	name: string;
	description: string | null;
	cover_image_url: string | null;
	group_type: string;
	location: string | null;
	organizer_id: string;
}

export interface SearchResults {
	events: SearchEventResult[];
	groups: SearchGroupResult[];
	eventsCount: number;
	groupsCount: number;
}

/**
 * Search for events using full-text search
 * @param query - Search query string
 * @param userId - Current user ID (for RLS)
 * @param limit - Maximum number of results (default: 20)
 * @returns Array of matching events
 */
export async function searchEvents(
	query: string,
	userId: string | null = null,
	limit = 20
): Promise<SearchEventResult[]> {
	try {
		// Build the query
		let dbQuery = supabaseAdmin
			.from('events')
			.select(
				`
				id,
				title,
				description,
				event_type,
				start_time,
				venue_name,
				venue_address,
				capacity,
				cover_image_url,
				visibility,
				creator_id,
				group_id
			`
			)
			// Only search public events and future events
			.gte('start_time', new Date().toISOString())
			.order('start_time', { ascending: true })
			.limit(limit);

		// Apply full-text search using to_tsvector
		const searchQuery = query.trim().split(/\s+/).join(' & ');
		dbQuery = dbQuery.textSearch('title,description', searchQuery, {
			type: 'websearch',
			config: 'english'
		});

		const { data, error } = await dbQuery;

		if (error) {
			// Log error for debugging but don't expose details to client
			throw error;
		}

		// Filter based on visibility and user
		const filteredData = (data || []).filter((event) => {
			// Public events are always visible
			if (event.visibility === 'public') {
				return true;
			}

			// If no user, only show public events
			if (!userId) {
				return false;
			}

			// Creator can always see their own events
			if (event.creator_id === userId) {
				return true;
			}

			// For group_only and hidden events, additional checks would be needed
			// For now, we'll only show public events in search results
			return false;
		});

		return filteredData as SearchEventResult[];
	} catch {
		// Return empty array on error to prevent search from failing
		return [];
	}
}

/**
 * Search for groups using full-text search
 * @param query - Search query string
 * @param _userId - Current user ID (reserved for future RLS implementation)
 * @param limit - Maximum number of results (default: 20)
 * @returns Array of matching groups
 */
export async function searchGroups(
	query: string,
	_userId: string | null = null,
	limit = 20
): Promise<SearchGroupResult[]> {
	try {
		// Build the query - only search public groups for now
		const dbQuery = supabaseAdmin
			.from('groups')
			.select(
				`
				id,
				name,
				description,
				cover_image_url,
				group_type,
				location,
				organizer_id
			`
			)
			.eq('group_type', 'public')
			.order('created_at', { ascending: false })
			.limit(limit);

		// Apply full-text search using to_tsvector
		const searchQuery = query.trim().split(/\s+/).join(' & ');
		const { data, error } = await dbQuery.textSearch('name,description', searchQuery, {
			type: 'websearch',
			config: 'english'
		});

		if (error) {
			// Log error for debugging but don't expose details to client
			throw error;
		}

		return (data || []) as SearchGroupResult[];
	} catch {
		// Return empty array on error to prevent search from failing
		return [];
	}
}

/**
 * Search both events and groups
 * @param query - Search query string
 * @param userId - Current user ID (for RLS)
 * @returns Combined search results
 */
export async function search(query: string, userId: string | null = null): Promise<SearchResults> {
	const [events, groups] = await Promise.all([
		searchEvents(query, userId),
		searchGroups(query, userId)
	]);

	return {
		events,
		groups,
		eventsCount: events.length,
		groupsCount: groups.length
	};
}
