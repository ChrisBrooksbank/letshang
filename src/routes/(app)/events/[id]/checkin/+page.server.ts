import type { PageServerLoad, Actions } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import { supabase } from '$lib/server/supabase';

const ONE_HOUR_MS = 60 * 60 * 1000;

export const load: PageServerLoad = async ({ params, locals }) => {
	const session = locals.session;
	if (!session?.user) {
		throw redirect(303, '/login');
	}

	const { id } = params;

	// Fetch event details
	const { data: event, error: eventError } = await supabase
		.from('events')
		.select('*')
		.eq('id', id)
		.single();

	if (eventError || !event) {
		throw error(404, 'Event not found');
	}

	// Verify user is event creator (host)
	if (event.creator_id !== session.user.id) {
		throw error(403, 'Only event hosts can access check-in');
	}

	// Check if check-in is available (1 hour before event start)
	const eventStartTime = new Date(event.start_time).getTime();
	const now = Date.now();
	const checkInOpenTime = eventStartTime - ONE_HOUR_MS;
	const checkInAvailable = now >= checkInOpenTime;

	// Fetch all "going" RSVPs with user details
	const { data: attendees, error: attendeesError } = await supabase
		.from('event_rsvps')
		.select(
			`
			id,
			user_id,
			checked_in_at,
			created_at,
			users:user_id (
				id,
				email,
				display_name,
				profile_photo_url
			)
		`
		)
		.eq('event_id', id)
		.eq('status', 'going')
		.order('checked_in_at', { ascending: false, nullsFirst: false })
		.order('created_at', { ascending: true });

	if (attendeesError) {
		// eslint-disable-next-line no-console -- Server-side logging for debugging
		console.error('Error fetching attendees:', attendeesError);
		throw error(500, 'Failed to load attendees');
	}

	// Calculate check-in stats
	const totalGoing = attendees?.length || 0;
	const checkedInCount = attendees?.filter((a) => a.checked_in_at !== null).length || 0;

	return {
		event,
		attendees: attendees || [],
		checkInAvailable,
		checkInOpenTime,
		stats: {
			totalGoing,
			checkedInCount,
			notCheckedInCount: totalGoing - checkedInCount
		}
	};
};

export const actions: Actions = {
	checkIn: async ({ request, locals, params }) => {
		const session = locals.session;
		if (!session?.user) {
			return fail(401, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const rsvpId = formData.get('rsvp_id') as string;

		if (!rsvpId) {
			return fail(400, { error: 'RSVP ID is required' });
		}

		const { id: eventId } = params;

		// Verify user is event creator
		const { data: event, error: eventError } = await supabase
			.from('events')
			.select('creator_id, start_time')
			.eq('id', eventId)
			.single();

		if (eventError || !event) {
			return fail(404, { error: 'Event not found' });
		}

		if (event.creator_id !== session.user.id) {
			return fail(403, { error: 'Only event hosts can check in attendees' });
		}

		// Verify check-in is available (1 hour before event)
		const eventStartTime = new Date(event.start_time).getTime();
		const now = Date.now();
		const checkInOpenTime = eventStartTime - ONE_HOUR_MS;

		if (now < checkInOpenTime) {
			return fail(400, { error: 'Check-in opens 1 hour before the event' });
		}

		// Update RSVP to mark as checked in
		const { error: updateError } = await supabase
			.from('event_rsvps')
			.update({
				checked_in_at: new Date().toISOString(),
				updated_at: new Date().toISOString()
			})
			.eq('id', rsvpId)
			.eq('event_id', eventId)
			.eq('status', 'going');

		if (updateError) {
			// eslint-disable-next-line no-console -- Server-side logging for debugging
			console.error('Error checking in attendee:', updateError);
			return fail(500, { error: 'Failed to check in attendee' });
		}

		return { success: true };
	},

	uncheckIn: async ({ request, locals, params }) => {
		const session = locals.session;
		if (!session?.user) {
			return fail(401, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const rsvpId = formData.get('rsvp_id') as string;

		if (!rsvpId) {
			return fail(400, { error: 'RSVP ID is required' });
		}

		const { id: eventId } = params;

		// Verify user is event creator
		const { data: event, error: eventError } = await supabase
			.from('events')
			.select('creator_id')
			.eq('id', eventId)
			.single();

		if (eventError || !event) {
			return fail(404, { error: 'Event not found' });
		}

		if (event.creator_id !== session.user.id) {
			return fail(403, { error: 'Only event hosts can uncheck attendees' });
		}

		// Update RSVP to remove check-in
		const { error: updateError } = await supabase
			.from('event_rsvps')
			.update({
				checked_in_at: null,
				updated_at: new Date().toISOString()
			})
			.eq('id', rsvpId)
			.eq('event_id', eventId)
			.eq('status', 'going');

		if (updateError) {
			// eslint-disable-next-line no-console -- Server-side logging for debugging
			console.error('Error unchecking attendee:', updateError);
			return fail(500, { error: 'Failed to uncheck attendee' });
		}

		return { success: true };
	}
};
