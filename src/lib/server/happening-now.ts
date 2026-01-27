/**
 * Server functions for fetching events currently in progress ("Happening Now")
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export interface HappeningNowEvent {
	id: string;
	title: string;
	description: string;
	start_time: string;
	end_time: string | null;
	event_type: string;
	venue_name: string | null;
	venue_address: string | null;
	capacity: number | null;
	cover_image_url: string | null;
	visibility: string;
	creator_id: string;
	group_id: string | null;
	event_size: string | null;
}

/**
 * Fetch events that are currently in progress
 * @param supabase - Supabase client
 * @param limit - Optional limit on number of results
 * @returns Array of events happening now
 */
export async function fetchHappeningNowEvents(
	supabase: SupabaseClient,
	limit?: number
): Promise<HappeningNowEvent[]> {
	const now = new Date().toISOString();

	// Query for events where:
	// - start_time <= now (event has started)
	// - end_time > now (event has not ended)
	// - visibility = public (only show public events)
	let query = supabase
		.from('events')
		.select(
			'id, title, description, start_time, end_time, event_type, venue_name, venue_address, capacity, cover_image_url, visibility, creator_id, group_id, event_size'
		)
		.lte('start_time', now)
		.gt('end_time', now)
		.eq('visibility', 'public')
		.order('start_time', { ascending: true });

	// Apply limit if provided
	if (limit !== undefined) {
		query = query.limit(limit);
	}

	const { data, error } = await query;

	if (error) {
		throw new Error(error.message);
	}

	return (data as HappeningNowEvent[]) || [];
}
