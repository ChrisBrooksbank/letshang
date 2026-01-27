/**
 * Server functions for fetching events happening today
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export interface HappeningTodayEvent {
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
 * Fetch events that are happening today (not yet started)
 * @param supabase - Supabase client
 * @param limit - Optional limit on number of results
 * @returns Array of events happening today
 */
export async function fetchHappeningTodayEvents(
	supabase: SupabaseClient,
	limit?: number
): Promise<HappeningTodayEvent[]> {
	const now = new Date();

	// Get end of today in local timezone
	const endOfToday = new Date(now);
	endOfToday.setHours(23, 59, 59, 999);

	// Convert to ISO strings for database query
	const endOfTodayISO = endOfToday.toISOString();
	const nowISO = now.toISOString();

	// Query for events where:
	// - start_time >= now (event has not started yet)
	// - start_time <= end of today (event starts today)
	// - visibility = public (only show public events)
	let query = supabase
		.from('events')
		.select(
			'id, title, description, start_time, end_time, event_type, venue_name, venue_address, capacity, cover_image_url, visibility, creator_id, group_id, event_size'
		)
		.gte('start_time', nowISO)
		.lte('start_time', endOfTodayISO)
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

	return (data as HappeningTodayEvent[]) || [];
}
