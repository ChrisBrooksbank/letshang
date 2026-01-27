// Server-side search functionality
// Handles full-text search for events and groups

import { supabaseAdmin } from './supabase';

export interface SearchEventResult {
	id: string;
	title: string;
	description: string;
	event_type: string;
	start_time: string;
	end_time: string | null;
	venue_name: string | null;
	venue_address: string | null;
	capacity: number | null;
	cover_image_url: string | null;
	visibility: string;
	creator_id: string;
	group_id: string | null;
	event_size: string | null;
	rank?: number; // Relevance ranking score
}

export interface SearchFilters {
	eventType?: 'in_person' | 'online' | 'hybrid';
	startDate?: string;
	endDate?: string;
	eventSize?: 'intimate' | 'small' | 'medium' | 'large';
}

export interface SearchGroupResult {
	id: string;
	name: string;
	description: string | null;
	cover_image_url: string | null;
	group_type: string;
	location: string | null;
	organizer_id: string;
	rank?: number; // Relevance ranking score
}

export interface SearchResults {
	events: SearchEventResult[];
	groups: SearchGroupResult[];
	eventsCount: number;
	groupsCount: number;
}

/**
 * Search for events using relevance-ranked full-text search
 * @param query - Search query string
 * @param userId - Current user ID (for RLS)
 * @param limit - Maximum number of results (default: 20)
 * @returns Array of matching events, ordered by relevance
 */
export async function searchEvents(
	query: string,
	userId: string | null = null,
	limit = 20
): Promise<SearchEventResult[]> {
	try {
		// Prepare search query with typo tolerance
		// websearch_to_tsquery provides better fuzzy matching and handles typos
		const searchTerm = query
			.trim()
			.replace(/[^\w\s]/g, ' ')
			.trim();

		if (!searchTerm) {
			return [];
		}

		// Use RPC call for relevance-ranked search with typo tolerance
		// This uses ts_rank_cd for relevance scoring and websearch_to_tsquery for fuzzy matching
		const { data, error } = await supabaseAdmin.rpc('search_events_ranked', {
			search_query: searchTerm,
			max_results: limit,
			current_user_id: userId
		});

		if (error) {
			// Log error for debugging but don't expose details to client
			throw error;
		}

		return (data || []) as SearchEventResult[];
	} catch {
		// Return empty array on error to prevent search from failing
		return [];
	}
}

/**
 * Search for groups using relevance-ranked full-text search
 * @param query - Search query string
 * @param userId - Current user ID (for future private group access)
 * @param limit - Maximum number of results (default: 20)
 * @returns Array of matching groups, ordered by relevance
 */
export async function searchGroups(
	query: string,
	userId: string | null = null,
	limit = 20
): Promise<SearchGroupResult[]> {
	try {
		// Prepare search query with typo tolerance
		const searchTerm = query
			.trim()
			.replace(/[^\w\s]/g, ' ')
			.trim();

		if (!searchTerm) {
			return [];
		}

		// Use RPC call for relevance-ranked search with typo tolerance
		// This uses ts_rank_cd for relevance scoring and websearch_to_tsquery for fuzzy matching
		const { data, error } = await supabaseAdmin.rpc('search_groups_ranked', {
			search_query: searchTerm,
			max_results: limit,
			current_user_id: userId
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
 * Search for events with filters
 * @param query - Search query string
 * @param userId - Current user ID (for RLS)
 * @param filters - Optional filters (event type, date range, size)
 * @param limit - Maximum number of results (default: 20)
 * @returns Array of matching events, ordered by relevance
 */
export async function searchEventsWithFilters(
	query: string,
	userId: string | null = null,
	filters: SearchFilters = {},
	limit = 20
): Promise<SearchEventResult[]> {
	try {
		// Prepare search query
		const searchTerm = query
			.trim()
			.replace(/[^\w\s]/g, ' ')
			.trim();

		if (!searchTerm) {
			return [];
		}

		// Call RPC with filter parameters
		const { data, error } = await supabaseAdmin.rpc('search_events_ranked', {
			search_query: searchTerm,
			max_results: limit,
			current_user_id: userId,
			filter_event_type: filters.eventType || null,
			filter_start_date: filters.startDate || null,
			filter_end_date: filters.endDate || null,
			filter_event_size: filters.eventSize || null
		});

		if (error) {
			throw error;
		}

		return (data || []) as SearchEventResult[];
	} catch {
		return [];
	}
}

/**
 * Search both events and groups
 * @param query - Search query string
 * @param userId - Current user ID (for RLS)
 * @param filters - Optional filters (event type, date range, size)
 * @returns Combined search results
 */
export async function search(
	query: string,
	userId: string | null = null,
	filters: SearchFilters = {}
): Promise<SearchResults> {
	const [events, groups] = await Promise.all([
		searchEventsWithFilters(query, userId, filters),
		searchGroups(query, userId)
	]);

	return {
		events,
		groups,
		eventsCount: events.length,
		groupsCount: groups.length
	};
}
