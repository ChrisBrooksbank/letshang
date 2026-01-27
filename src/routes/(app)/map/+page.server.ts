import type { PageServerLoad } from './$types';

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

	// Calculate RSVP counts for each event
	const eventsWithCounts = typedEvents.map((event) => {
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

	return {
		events: eventsWithCounts
	};
};
