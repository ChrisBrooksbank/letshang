import type { PageServerLoad, Actions } from './$types';
import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';

// Type for event RSVP from the database
type EventRsvp = {
	rsvp_id: string;
	status: string;
};

// Type for event from database with RSVPs
type EventWithRsvps = {
	event_id: string;
	title: string;
	description: string;
	start_time: string;
	end_time: string;
	event_type: string;
	venue_name: string | null;
	venue_address: string | null;
	venue_lat: number | null;
	venue_lng: number | null;
	capacity: number | null;
	visibility: string;
	creator_id: string;
	event_rsvps: EventRsvp[];
};

// Validation schema for search area bounds
const searchAreaSchema = z.object({
	southWestLng: z.number().min(-180).max(180),
	southWestLat: z.number().min(-90).max(90),
	northEastLng: z.number().min(-180).max(180),
	northEastLat: z.number().min(-90).max(90)
});

/**
 * Fetch events within geographic bounds
 */
async function fetchEventsInBounds(
	supabase: SupabaseClient,
	bounds: z.infer<typeof searchAreaSchema>
): Promise<EventWithRsvps[]> {
	const now = new Date().toISOString();

	const { data: events, error } = await supabase
		.from('events')
		.select(
			`
			event_id,
			title,
			description,
			start_time,
			end_time,
			event_type,
			venue_name,
			venue_address,
			venue_lat,
			venue_lng,
			capacity,
			visibility,
			creator_id,
			event_rsvps!inner(rsvp_id, status)
		`
		)
		.in('event_type', ['in_person', 'hybrid'])
		.not('venue_lat', 'is', null)
		.not('venue_lng', 'is', null)
		.gte('end_time', now)
		.gte('venue_lat', bounds.southWestLat)
		.lte('venue_lat', bounds.northEastLat)
		.gte('venue_lng', bounds.southWestLng)
		.lte('venue_lng', bounds.northEastLng)
		.order('start_time', { ascending: true })
		.limit(200);

	if (error || !events) {
		// eslint-disable-next-line no-console
		console.error('Error fetching events in bounds:', { message: error?.message });
		return [];
	}

	return events as EventWithRsvps[];
}

/**
 * Transform events with RSVP counts
 */
function transformEventsWithCounts(events: EventWithRsvps[]) {
	return events.map((event) => {
		const goingCount = event.event_rsvps.filter((rsvp) => rsvp.status === 'going').length;
		const interestedCount = event.event_rsvps.filter((rsvp) => rsvp.status === 'interested').length;

		// Remove the rsvps array from the returned object to reduce data size
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { event_rsvps, ...eventData } = event;

		return {
			...eventData,
			goingCount,
			interestedCount
		};
	});
}

/**
 * Load function for the map discovery page.
 * Fetches all upcoming in-person and hybrid events that have location data.
 */
export const load: PageServerLoad = async ({ locals }) => {
	const supabase = locals.supabase;

	// Fetch all upcoming events with location data (venue_lat and venue_lng)
	// Only include in-person and hybrid events (not online-only)
	const now = new Date().toISOString();

	const { data: events, error } = await supabase
		.from('events')
		.select(
			`
			event_id,
			title,
			description,
			start_time,
			end_time,
			event_type,
			venue_name,
			venue_address,
			venue_lat,
			venue_lng,
			capacity,
			visibility,
			creator_id,
			event_rsvps!inner(rsvp_id, status)
		`
		)
		.in('event_type', ['in_person', 'hybrid'])
		.not('venue_lat', 'is', null)
		.not('venue_lng', 'is', null)
		.gte('end_time', now)
		.order('start_time', { ascending: true })
		.limit(200); // Limit to prevent overwhelming the map

	if (error || !events) {
		// Log error for debugging but don't expose to client
		// eslint-disable-next-line no-console
		console.error('Error fetching events for map:', { message: error?.message });
		return {
			events: []
		};
	}

	// Cast the events to our type
	const typedEvents = events as EventWithRsvps[];

	return {
		events: transformEventsWithCounts(typedEvents)
	};
};

export const actions: Actions = {
	searchArea: async ({ request, locals }) => {
		const supabase = locals.supabase;

		try {
			const formData = await request.formData();
			const boundsData = {
				southWestLng: parseFloat(formData.get('southWestLng') as string),
				southWestLat: parseFloat(formData.get('southWestLat') as string),
				northEastLng: parseFloat(formData.get('northEastLng') as string),
				northEastLat: parseFloat(formData.get('northEastLat') as string)
			};

			// Validate bounds
			const bounds = searchAreaSchema.parse(boundsData);

			// Fetch events in bounds
			const events = await fetchEventsInBounds(supabase, bounds);

			return {
				success: true,
				events: transformEventsWithCounts(events)
			};
		} catch (error) {
			// eslint-disable-next-line no-console
			console.error('Error in searchArea action:', { message: (error as Error).message });
			return {
				success: false,
				error: 'Failed to search area'
			};
		}
	}
};
