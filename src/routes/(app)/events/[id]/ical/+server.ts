/**
 * iCal Export API Endpoint
 *
 * Generates and downloads an .ics file for a single event
 */

import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabase } from '$lib/server/supabase';
import { generateICalEvent, generateICalFilename, type ICalEvent } from '$lib/utils/ical';

export const GET: RequestHandler = async ({ params, locals, url }) => {
	const session = locals.session;
	if (!session?.user) {
		throw error(401, 'Unauthorized');
	}

	const { id } = params;

	// Fetch event details
	const { data: event, error: eventError } = await supabase
		.from('events')
		.select(
			`
			*,
			profiles:creator_id (
				display_name,
				email
			)
		`
		)
		.eq('id', id)
		.single();

	if (eventError || !event) {
		throw error(404, 'Event not found');
	}

	// Check visibility: user must be able to view the event
	// Public events: anyone can export
	// Group-only events: must be a member of the group
	// Hidden events: must be the creator
	if (event.visibility === 'group_only' && event.group_id) {
		const { data: membership } = await supabase
			.from('group_members')
			.select('id')
			.eq('group_id', event.group_id)
			.eq('user_id', session.user.id)
			.eq('status', 'active')
			.single();

		if (!membership) {
			throw error(403, 'You must be a group member to export this event');
		}
	} else if (event.visibility === 'hidden' && event.creator_id !== session.user.id) {
		throw error(403, 'You do not have permission to export this event');
	}

	// Build location string
	let location = null;
	if (event.event_type === 'in_person' || event.event_type === 'hybrid') {
		location = [event.venue_name, event.venue_address].filter(Boolean).join(', ');
	}

	// Build the event URL
	const eventUrl = `${url.origin}/events/${event.id}`;

	// Build organizer info
	const organizerName = event.profiles?.display_name || 'LetsHang User';
	const organizerEmail = event.profiles?.email || undefined;

	// Prepare iCal event data
	const iCalEvent: ICalEvent = {
		id: event.id,
		title: event.title,
		description: event.description,
		startTime: event.start_time,
		endTime: event.end_time,
		location,
		url: eventUrl,
		organizer: {
			name: organizerName,
			email: organizerEmail
		}
	};

	// Generate iCal content
	const iCalContent = generateICalEvent(iCalEvent);

	// Generate filename
	const filename = generateICalFilename(event.title);

	// Return the .ics file
	return new Response(iCalContent, {
		headers: {
			'Content-Type': 'text/calendar; charset=utf-8',
			'Content-Disposition': `attachment; filename="${filename}"`
		}
	});
};
