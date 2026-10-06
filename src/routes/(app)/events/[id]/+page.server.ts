import type { PageServerLoad, Actions } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import { supabaseAdmin } from '$lib/server/supabase';
import { getConfirmationStats } from '$lib/server/confirmation-ping';
import {
	fetchEventComments,
	createComment,
	editComment,
	deleteComment
} from '$lib/server/comments';
import {
	commentCreationSchema,
	commentEditSchema,
	commentDeletionSchema
} from '$lib/schemas/comments';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Re-number waitlist positions sequentially (1, 2, 3...) preserving order
 */
async function reorderWaitlist(eventId: string): Promise<void> {
	const { error: reorderError } = await supabaseAdmin.rpc('reorder_waitlist', {
		p_event_id: eventId
	});

	if (reorderError) {
		// eslint-disable-next-line no-console -- Server-side logging for debugging
		console.error('Error reordering waitlist:', reorderError);
	}
}

/**
 * Promote the first waitlisted attendee (FIFO) after a "going" spot frees up.
 * Uses the admin client because it updates another user's RSVP, which RLS forbids.
 * Failures are logged, never surfaced: the triggering RSVP change already succeeded.
 */
async function promoteFromWaitlist(eventId: string): Promise<void> {
	const { data: event } = await supabaseAdmin
		.from('events')
		.select('capacity')
		.eq('id', eventId)
		.single();

	if (!event?.capacity) {
		return;
	}

	const { data: nextInLine, error: waitlistError } = await supabaseAdmin
		.from('event_rsvps')
		.select('id, user_id, waitlist_position')
		.eq('event_id', eventId)
		.eq('status', 'waitlisted')
		.order('waitlist_position', { ascending: true })
		.limit(1)
		.single();

	if (waitlistError || !nextInLine) {
		return;
	}

	const { error: promoteError } = await supabaseAdmin
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
		return;
	}

	await reorderWaitlist(eventId);
}

export const load: PageServerLoad = async ({ params, locals }) => {
	const session = locals.session;
	// Request-scoped client carries the user's JWT so RLS (auth.uid()) applies
	const supabase = locals.supabase as unknown as SupabaseClient;
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

	// Fetch confirmation stats for host
	let confirmationStats = null;
	if (event.creator_id === session.user.id) {
		try {
			confirmationStats = await getConfirmationStats(id);
		} catch (e) {
			// Don't fail the page load if confirmation stats fail
			// eslint-disable-next-line no-console
			console.error('Error fetching confirmation stats:', e);
		}
	}

	// Fetch comments if user has RSVPed
	let comments: Awaited<ReturnType<typeof fetchEventComments>>['comments'] = [];
	let hasRsvped = false;
	if (userRsvp) {
		hasRsvped = true;
		const commentsResult = await fetchEventComments(id, session.user.id);
		if (!commentsResult.error) {
			comments = commentsResult.comments;
		}
	}

	return {
		event,
		userRsvp: userRsvp || null,
		counts,
		userId: session.user.id,
		confirmationStats,
		comments,
		hasRsvped
	};
};

export const actions: Actions = {
	rsvp: async ({ request, locals, params }) => {
		const session = locals.session;
		// Request-scoped client carries the user's JWT so RLS (auth.uid()) applies
		const supabase = locals.supabase as unknown as SupabaseClient;
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

		// Current RSVP (if any) decides waitlist placement and whether a spot is freed
		const { data: existingRsvp } = await supabase
			.from('event_rsvps')
			.select('*')
			.eq('event_id', eventId)
			.eq('user_id', session.user.id)
			.single();

		// Already waitlisted and still wants to go: keep their place in line
		if (status === 'going' && existingRsvp?.status === 'waitlisted') {
			return {
				success: true,
				waitlisted: true,
				position: existingRsvp.waitlist_position,
				message: `Event is at capacity. You're #${existingRsvp.waitlist_position} on the waitlist!`
			};
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

			const currentGoingCount = goingRsvps?.length || 0;
			const userAlreadyGoing = existingRsvp?.status === 'going';

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

		// Prepare RSVP data (any non-waitlisted status leaves the waitlist)
		const rsvpData: {
			status: string;
			updated_at: string;
			waitlist_position: null;
			attendance_mode?: 'in_person' | 'online' | null;
		} = {
			status,
			updated_at: new Date().toISOString(),
			waitlist_position: null
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

		// Stepping down from "going" frees a spot; leaving the waitlist leaves a gap
		if (existingRsvp?.status === 'going' && status !== 'going') {
			await promoteFromWaitlist(eventId);
		} else if (existingRsvp?.status === 'waitlisted') {
			await reorderWaitlist(eventId);
		}

		return { success: true, status, attendanceMode };
	},

	cancelRsvp: async ({ locals, params }) => {
		const session = locals.session;
		// Request-scoped client carries the user's JWT so RLS (auth.uid()) applies
		const supabase = locals.supabase as unknown as SupabaseClient;
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

		// Free spot → promote; leaving the waitlist → close the gap in positions
		if (wasGoing) {
			await promoteFromWaitlist(eventId);
		} else if (currentRsvp?.status === 'waitlisted') {
			await reorderWaitlist(eventId);
		}

		return { success: true, canceled: true };
	},

	postComment: async ({ request, locals, params }) => {
		const session = locals.session;
		if (!session?.user) {
			return fail(401, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const rawData = {
			eventId: params.id,
			content: formData.get('content') as string,
			parentCommentId: (formData.get('parentCommentId') as string) || null
		};

		// Validate with Zod schema
		const validation = commentCreationSchema.safeParse(rawData);
		if (!validation.success) {
			const firstError = validation.error.issues[0];
			return fail(400, {
				error: firstError?.message || 'Invalid comment data'
			});
		}

		const { eventId, content, parentCommentId } = validation.data;

		const result = await createComment(eventId, session.user.id, content, parentCommentId || null);

		if (result.error) {
			return fail(400, { error: result.error });
		}

		return { success: true, comment: result.comment };
	},

	editComment: async ({ request, locals }) => {
		const session = locals.session;
		if (!session?.user) {
			return fail(401, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const rawData = {
			commentId: formData.get('commentId') as string,
			content: formData.get('content') as string
		};

		// Validate with Zod schema
		const validation = commentEditSchema.safeParse(rawData);
		if (!validation.success) {
			const firstError = validation.error.issues[0];
			return fail(400, {
				error: firstError?.message || 'Invalid comment data'
			});
		}

		const { commentId, content } = validation.data;

		const result = await editComment(commentId, session.user.id, content);

		if (result.error) {
			return fail(400, { error: result.error });
		}

		return { success: true, comment: result.comment };
	},

	deleteComment: async ({ request, locals }) => {
		const session = locals.session;
		if (!session?.user) {
			return fail(401, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const rawData = {
			commentId: formData.get('commentId') as string
		};

		// Validate with Zod schema
		const validation = commentDeletionSchema.safeParse(rawData);
		if (!validation.success) {
			const firstError = validation.error.issues[0];
			return fail(400, {
				error: firstError?.message || 'Invalid comment data'
			});
		}

		const { commentId } = validation.data;

		const result = await deleteComment(commentId, session.user.id);

		if (!result.success) {
			return fail(400, { error: result.error || 'Failed to delete comment' });
		}

		return { success: true, deleted: true };
	}
};
