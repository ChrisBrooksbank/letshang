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
		notGoing: rsvpCounts?.filter((r) => r.status === 'not_going').length || 0
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

		// Validate status
		if (!['going', 'interested', 'not_going'].includes(status)) {
			return fail(400, { error: 'Invalid RSVP status' });
		}

		const { id: eventId } = params;

		// Check if RSVP exists
		const { data: existingRsvp } = await supabase
			.from('event_rsvps')
			.select('*')
			.eq('event_id', eventId)
			.eq('user_id', session.user.id)
			.single();

		if (existingRsvp) {
			// Update existing RSVP
			const { error: updateError } = await supabase
				.from('event_rsvps')
				.update({ status, updated_at: new Date().toISOString() })
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
				status
			});

			if (insertError) {
				// eslint-disable-next-line no-console -- Server-side logging for debugging
				console.error('Error creating RSVP:', insertError);
				return fail(500, { error: 'Failed to create RSVP' });
			}
		}

		return { success: true, status };
	},

	cancelRsvp: async ({ locals, params }) => {
		const session = locals.session;
		if (!session?.user) {
			return fail(401, { error: 'Unauthorized' });
		}

		const { id: eventId } = params;

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

		return { success: true, canceled: true };
	}
};
