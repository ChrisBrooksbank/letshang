/**
 * Server functions for fetching nearby events based on user location
 * Supports both saved user location and GPS coordinates
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { calculateDistance, type Coordinates } from '$lib/utils/location';

/**
 * Event with location and distance
 */
export interface EventWithDistance {
	id: string;
	title: string;
	description: string | null;
	start_time: string;
	end_time: string | null;
	event_type: 'in_person' | 'online' | 'hybrid';
	venue_name: string | null;
	venue_address: string | null;
	venue_lat: number | null;
	venue_lng: number | null;
	visibility: 'public' | 'group_only' | 'hidden';
	group_id: string | null;
	capacity: number | null;
	cover_image_url: string | null;
	creator_id: string;
	event_size: 'intimate' | 'small' | 'medium' | 'large' | null;
	distance_miles: number;
	going_count: number;
	interested_count: number;
}

/**
 * Fetch nearby events based on coordinates
 * Returns events sorted by distance
 *
 * @param supabase - Supabase client
 * @param userCoords - User's coordinates (lat/lng)
 * @param radiusMiles - Search radius in miles (default: 25)
 * @param limit - Maximum number of results (default: 20)
 * @returns Array of events with distance
 */
export async function fetchNearbyEvents(
	supabase: SupabaseClient,
	userCoords: Coordinates,
	radiusMiles = 25,
	limit = 20
): Promise<EventWithDistance[]> {
	// Rough approximation: 1 degree latitude ≈ 69 miles
	// Use a bounding box to filter events before calculating exact distance
	const latDelta = radiusMiles / 69;
	const lngDelta = radiusMiles / (69 * Math.cos((userCoords.lat * Math.PI) / 180));

	const minLat = userCoords.lat - latDelta;
	const maxLat = userCoords.lat + latDelta;
	const minLng = userCoords.lng - lngDelta;
	const maxLng = userCoords.lng + lngDelta;

	// Fetch in-person and hybrid events within bounding box
	// Only fetch upcoming events (start_time > now)
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const { data: events, error } = await (supabase as any)
		.from('events')
		.select(
			`
			id,
			title,
			description,
			start_time,
			end_time,
			event_type,
			venue_name,
			venue_address,
			venue_lat,
			venue_lng,
			visibility,
			group_id,
			capacity,
			cover_image_url,
			creator_id,
			event_size
		`
		)
		.in('event_type', ['in_person', 'hybrid'])
		.not('venue_lat', 'is', null)
		.not('venue_lng', 'is', null)
		.gte('venue_lat', minLat)
		.lte('venue_lat', maxLat)
		.gte('venue_lng', minLng)
		.lte('venue_lng', maxLng)
		.gte('start_time', new Date().toISOString())
		.eq('visibility', 'public') // Only public events for discovery
		.order('start_time', { ascending: true })
		.limit(limit * 2); // Fetch extra to filter by exact distance

	if (error) {
		throw new Error(`Failed to fetch nearby events: ${error.message}`);
	}

	if (!events || events.length === 0) {
		return [];
	}

	// Calculate exact distance for each event and filter by radius
	const eventsWithDistance: Array<EventWithDistance & { distance_miles: number }> = events
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		.map((event: any) => {
			const eventCoords: Coordinates = {
				lat: event.venue_lat,
				lng: event.venue_lng
			};

			const distance = calculateDistance(userCoords, eventCoords);

			return {
				...event,
				distance_miles: distance,
				going_count: 0, // Will be populated below
				interested_count: 0 // Will be populated below
			};
		})
		.filter(
			(event: EventWithDistance & { distance_miles: number }) => event.distance_miles <= radiusMiles
		)
		.sort(
			(
				a: EventWithDistance & { distance_miles: number },
				b: EventWithDistance & { distance_miles: number }
			) => a.distance_miles - b.distance_miles
		)
		.slice(0, limit);

	// Fetch RSVP counts for all events in a single query
	const eventIds = eventsWithDistance.map((e) => e.id);

	if (eventIds.length > 0) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const { data: rsvpCounts } = await (supabase as any)
			.from('event_rsvps')
			.select('event_id, status')
			.in('event_id', eventIds);

		if (rsvpCounts) {
			// Aggregate counts by event
			const countsByEvent: Record<string, { going: number; interested: number }> = {};

			for (const rsvp of rsvpCounts) {
				if (!countsByEvent[rsvp.event_id]) {
					countsByEvent[rsvp.event_id] = { going: 0, interested: 0 };
				}

				if (rsvp.status === 'going') {
					countsByEvent[rsvp.event_id].going++;
				} else if (rsvp.status === 'interested') {
					countsByEvent[rsvp.event_id].interested++;
				}
			}

			// Add counts to events
			for (const event of eventsWithDistance) {
				const counts = countsByEvent[event.id];
				if (counts) {
					event.going_count = counts.going;
					event.interested_count = counts.interested;
				}
			}
		}
	}

	return eventsWithDistance;
}

/**
 * Fetch user's saved location coordinates
 * Returns null if user has no saved location or coordinates not geocoded
 *
 * @param supabase - Supabase client
 * @param userId - User ID
 * @returns User's saved coordinates or null
 */
export async function fetchUserLocation(
	supabase: SupabaseClient,
	userId: string
): Promise<Coordinates | null> {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const { data: user, error } = await (supabase as any)
		.from('users')
		.select('location_lat, location_lng')
		.eq('id', userId)
		.single();

	if (error || !user || user.location_lat === null || user.location_lng === null) {
		return null;
	}

	return {
		lat: user.location_lat,
		lng: user.location_lng
	};
}
