import type { PageServerLoad, Actions } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import { supabase } from '$lib/server/supabase';

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

	// Fetch current user's RSVP status
	const { data: userRsvp } = await supabase
		.from('event_rsvps')
		.select('*')
		.eq('event_id', id)
		.eq('user_id', session.user.id)
		.single();

	// Fetch attendee counts
	const { data: rsvpCounts } = await supabase
		.from('event_rsvps')
		.select('status')
		.eq('event_id', id);

	const counts = {
		going: rsvpCounts?.filter((r) => r.status === 'going').length || 0,
		interested: rsvpCounts?.filter((r) => r.status === 'interested').length || 0,
		notGoing: rsvpCounts?.filter((r) => r.status === 'not_going').length || 0,
		waitlisted: rsvpCounts?.filter((r) => r.status === 'waitlisted').length || 0
	};

	return {
		event,
		userRsvp: userRsvp || null,
		counts,
		userId: session.user.id
	};
};

export const actions: Actions = {
	rsvp: async ({ request, locals, params }) => {
		const session = locals.session;
		if (!session?.user) {
			return fail(401, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const status = formData.get('status') as string;
		const attendanceMode = formData.get('attendance_mode') as string | null;

		// Validate status
		if (!['going', 'interested', 'not_going'].includes(status)) {
			return fail(400, { error: 'Invalid RSVP status' });
		}

		// Validate attendance mode if provided
		if (attendanceMode && !['in_person', 'online'].includes(attendanceMode)) {
			return fail(400, { error: 'Invalid attendance mode' });
		}

		const { id: eventId } = params;

		// Fetch event to check if it's hybrid and capacity
		const { data: event, error: eventError } = await supabase
			.from('events')
			.select('event_type, capacity')
			.eq('id', eventId)
			.single();

		if (eventError || !event) {
			return fail(404, { error: 'Event not found' });
		}

		// For hybrid events with "going" status, attendance mode is required
		if (event.event_type === 'hybrid' && status === 'going' && !attendanceMode) {
			return fail(400, { error: 'Attendance mode is required for hybrid events' });
		}

		// Check capacity if user is trying to RSVP "going"
		if (status === 'going' && event.capacity) {
			// Count current "going" RSVPs
			const { data: goingRsvps, error: countError } = await supabase
				.from('event_rsvps')
				.select('id')
				.eq('event_id', eventId)
				.eq('status', 'going');

			if (countError) {
				// eslint-disable-next-line no-console -- Server-side logging for debugging
				console.error('Error counting RSVPs:', countError);
				return fail(500, { error: 'Failed to check event capacity' });
			}

			// Check if user already has an existing "going" RSVP
			const { data: userCurrentRsvp } = await supabase
				.from('event_rsvps')
				.select('status')
				.eq('event_id', eventId)
				.eq('user_id', session.user.id)
				.single();

			const currentGoingCount = goingRsvps?.length || 0;
			const userAlreadyGoing = userCurrentRsvp?.status === 'going';

			// If capacity is reached and user is not already going, add to waitlist
			if (currentGoingCount >= event.capacity && !userAlreadyGoing) {
				// Get current waitlist count to assign position
				const { data: waitlistRsvps, error: waitlistError } = await supabase
					.from('event_rsvps')
					.select('waitlist_position')
					.eq('event_id', eventId)
					.eq('status', 'waitlisted')
					.order('waitlist_position', { ascending: false })
					.limit(1);

				if (waitlistError) {
					// eslint-disable-next-line no-console -- Server-side logging for debugging
					console.error('Error fetching waitlist:', waitlistError);
					return fail(500, { error: 'Failed to add to waitlist' });
				}

				const maxPosition = waitlistRsvps?.[0]?.waitlist_position || 0;
				const newPosition = maxPosition + 1;

				// Check if RSVP exists
				const { data: existingRsvp } = await supabase
					.from('event_rsvps')
					.select('*')
					.eq('event_id', eventId)
					.eq('user_id', session.user.id)
					.single();

				const waitlistData = {
					status: 'waitlisted',
					waitlist_position: newPosition,
					updated_at: new Date().toISOString()
				};

				if (existingRsvp) {
					// Update existing RSVP to waitlisted
					const { error: updateError } = await supabase
						.from('event_rsvps')
						.update(waitlistData)
						.eq('id', existingRsvp.id);

					if (updateError) {
						// eslint-disable-next-line no-console -- Server-side logging for debugging
						console.error('Error updating to waitlist:', updateError);
						return fail(500, { error: 'Failed to add to waitlist' });
					}
				} else {
					// Create new waitlisted RSVP
					const { error: insertError } = await supabase.from('event_rsvps').insert({
						event_id: eventId,
						user_id: session.user.id,
						...waitlistData
					});

					if (insertError) {
						// eslint-disable-next-line no-console -- Server-side logging for debugging
						console.error('Error creating waitlist RSVP:', insertError);
						return fail(500, { error: 'Failed to add to waitlist' });
					}
				}

				return {
					success: true,
					waitlisted: true,
					position: newPosition,
					message: `Event is at capacity. You're #${newPosition} on the waitlist!`
				};
			}
		}

		// Check if RSVP exists
		const { data: existingRsvp } = await supabase
			.from('event_rsvps')
			.select('*')
			.eq('event_id', eventId)
			.eq('user_id', session.user.id)
			.single();

		// Prepare RSVP data
		const rsvpData: {
			status: string;
			updated_at: string;
			attendance_mode?: 'in_person' | 'online' | null;
		} = {
			status,
			updated_at: new Date().toISOString()
		};

		// Only set attendance_mode for hybrid events when going/interested
		if (event.event_type === 'hybrid' && (status === 'going' || status === 'interested')) {
			rsvpData.attendance_mode = (attendanceMode as 'in_person' | 'online') || null;
		} else {
			rsvpData.attendance_mode = null;
		}

		if (existingRsvp) {
			// Update existing RSVP
			const { error: updateError } = await supabase
				.from('event_rsvps')
				.update(rsvpData)
				.eq('id', existingRsvp.id);

			if (updateError) {
				// eslint-disable-next-line no-console -- Server-side logging for debugging
				console.error('Error updating RSVP:', updateError);
				return fail(500, { error: 'Failed to update RSVP' });
			}
		} else {
			// Create new RSVP
			const { error: insertError } = await supabase.from('event_rsvps').insert({
				event_id: eventId,
				user_id: session.user.id,
				...rsvpData
			});

			if (insertError) {
				// eslint-disable-next-line no-console -- Server-side logging for debugging
				console.error('Error creating RSVP:', insertError);
				return fail(500, { error: 'Failed to create RSVP' });
			}
		}

		return { success: true, status, attendanceMode };
	},

	cancelRsvp: async ({ locals, params }) => {
		const session = locals.session;
		if (!session?.user) {
			return fail(401, { error: 'Unauthorized' });
		}

		const { id: eventId } = params;

		// Get the user's current RSVP before deleting
		const { data: currentRsvp } = await supabase
			.from('event_rsvps')
			.select('status')
			.eq('event_id', eventId)
			.eq('user_id', session.user.id)
			.single();

		const wasGoing = currentRsvp?.status === 'going';

		const { error: deleteError } = await supabase
			.from('event_rsvps')
			.delete()
			.eq('event_id', eventId)
			.eq('user_id', session.user.id);

		if (deleteError) {
			// eslint-disable-next-line no-console -- Server-side logging for debugging
			console.error('Error canceling RSVP:', deleteError);
			return fail(500, { error: 'Failed to cancel RSVP' });
		}

		// If the user was "going", check if we need to promote from waitlist
		if (wasGoing) {
			// Fetch event to check capacity
			const { data: event } = await supabase
				.from('events')
				.select('capacity')
				.eq('id', eventId)
				.single();

			if (event?.capacity) {
				// Get the first person on the waitlist (FIFO)
				const { data: nextInLine, error: waitlistError } = await supabase
					.from('event_rsvps')
					.select('id, user_id, waitlist_position')
					.eq('event_id', eventId)
					.eq('status', 'waitlisted')
					.order('waitlist_position', { ascending: true })
					.limit(1)
					.single();

				if (!waitlistError && nextInLine) {
					// Promote the first person on the waitlist to "going"
					const { error: promoteError } = await supabase
						.from('event_rsvps')
						.update({
							status: 'going',
							waitlist_position: null,
							updated_at: new Date().toISOString()
						})
						.eq('id', nextInLine.id);

					if (promoteError) {
						// eslint-disable-next-line no-console -- Server-side logging for debugging
						console.error('Error promoting from waitlist:', promoteError);
						// Don't fail the whole operation if promotion fails
					} else {
						// Update positions for remaining waitlist members
						const { error: reorderError } = await supabase.rpc('reorder_waitlist', {
							p_event_id: eventId
						});

						if (reorderError) {
							// eslint-disable-next-line no-console -- Server-side logging for debugging
							console.error('Error reordering waitlist:', reorderError);
							// Don't fail the whole operation if reordering fails
						}
					}
				}
			}
		}

		return { success: true, canceled: true };
	}
};
