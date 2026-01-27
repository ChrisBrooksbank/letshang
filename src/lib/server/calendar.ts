/**
 * Calendar Server Functions
 *
 * Server-side functions for fetching and managing calendar data.
 */

import { supabase } from './supabase';

export interface CalendarEvent {
	id: string;
	title: string;
	start_time: string;
	end_time: string | null;
	event_type: 'in_person' | 'online' | 'hybrid';
	venue_name: string | null;
	venue_address: string | null;
	video_link: string | null;
	group_id: string | null;
	group_name: string | null;
	rsvp_status: 'going' | 'interested' | 'not_going' | 'waitlisted';
	attendance_mode: 'in_person' | 'online' | null;
}

/**
 * Fetch all events the user has RSVPed to
 * Includes event details and associated group information
 */
export async function fetchUserCalendarEvents(
	userId: string,
	options?: {
		startDate?: string;
		endDate?: string;
		groupId?: string;
		statuses?: Array<'going' | 'interested' | 'not_going' | 'waitlisted'>;
	}
): Promise<{ events: CalendarEvent[]; error: string | null }> {
	try {
		// Build query
		let query = supabase
			.from('event_rsvps')
			.select(
				`
				id,
				status,
				attendance_mode,
				events!inner (
					id,
					title,
					start_time,
					end_time,
					event_type,
					venue_name,
					venue_address,
					video_link,
					group_id,
					groups (
						name
					)
				)
			`
			)
			.eq('user_id', userId)
			.order('events(start_time)', { ascending: true });

		// Apply filters
		if (options?.startDate) {
			query = query.gte('events.start_time', options.startDate);
		}

		if (options?.endDate) {
			query = query.lte('events.start_time', options.endDate);
		}

		if (options?.groupId) {
			query = query.eq('events.group_id', options.groupId);
		}

		if (options?.statuses && options.statuses.length > 0) {
			query = query.in('status', options.statuses);
		}

		const { data, error } = await query;

		if (error) {
			return { events: [], error: error.message };
		}

		// Transform the data into CalendarEvent format
		const events: CalendarEvent[] = (data || []).map((rsvp) => {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const event = rsvp.events as any;

			return {
				id: event.id,
				title: event.title,
				start_time: event.start_time,
				end_time: event.end_time,
				event_type: event.event_type,
				venue_name: event.venue_name,
				venue_address: event.venue_address,
				video_link: event.video_link,
				group_id: event.group_id,
				group_name: event.groups?.name || null,
				rsvp_status: rsvp.status as 'going' | 'interested' | 'not_going' | 'waitlisted',
				attendance_mode: rsvp.attendance_mode
			};
		});

		return { events, error: null };
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Unknown error fetching calendar events';
		return { events: [], error: message };
	}
}

/**
 * Fetch all groups the user is a member of
 * Used for filtering calendar events by group
 */
export async function fetchUserGroups(
	userId: string
): Promise<{ groups: Array<{ id: string; name: string }>; error: string | null }> {
	try {
		const { data, error } = await supabase
			.from('group_members')
			.select(
				`
				groups!inner (
					id,
					name
				)
			`
			)
			.eq('user_id', userId)
			.eq('status', 'active')
			.order('groups(name)', { ascending: true });

		if (error) {
			return { groups: [], error: error.message };
		}

		// Transform the data
		const groups = (data || []).map((member) => {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const group = member.groups as any;
			return {
				id: group.id,
				name: group.name
			};
		});

		return { groups, error: null };
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Unknown error fetching user groups';
		return { groups: [], error: message };
	}
}
