import { fail, redirect, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { eventCreationSchema } from '$lib/schemas/events';
import { calculateEventSize } from '$lib/utils/event-size';

export const load: PageServerLoad = async ({ locals }) => {
	// Ensure user is authenticated
	const session = await locals.supabase.auth.getSession();
	if (!session.data.session) {
		throw redirect(303, '/login');
	}

	// Fetch groups where the user can create events
	// (groups where they are a member with active status)
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const { data: userGroups } = await (locals.supabase as any)
		.from('group_members')
		.select('group_id, groups!inner(id, name)')
		.eq('user_id', session.data.session.user.id)
		.eq('status', 'active')
		.order('groups.name');

	// Transform the data to a simpler format
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const groups = (userGroups || []).map((membership: any) => ({
		id: membership.groups.id,
		name: membership.groups.name
	}));

	// Initialize empty form
	const form = await superValidate(null, zod4(eventCreationSchema));
	return { form, groups };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		// Ensure user is authenticated
		const session = await locals.supabase.auth.getSession();
		if (!session.data.session) {
			throw redirect(303, '/login');
		}

		// Validate form data
		const form = await superValidate(request, zod4(eventCreationSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		// Type assertions for form.data
		const {
			title,
			description,
			eventType,
			startTime,
			endTime,
			durationMinutes,
			venueName,
			venueAddress,
			venueLat,
			venueLng,
			videoLink,
			groupId,
			visibility,
			capacity,
			formatTags,
			accessibilityTags,
			eventSize,
			coverImageUrl
		} = form.data as {
			title: string;
			description: string;
			eventType: 'in_person' | 'online' | 'hybrid';
			startTime: string;
			endTime?: string;
			durationMinutes?: number;
			venueName?: string;
			venueAddress?: string;
			venueLat?: number | null;
			venueLng?: number | null;
			videoLink?: string;
			groupId?: string | null;
			visibility: 'public' | 'group_only' | 'hidden';
			capacity?: number | null;
			formatTags?: Array<'speaker' | 'workshop' | 'activity' | 'discussion' | 'mixer' | 'hangout'>;
			accessibilityTags?: Array<
				'first_timer_friendly' | 'structured_activity' | 'low_pressure' | 'beginner_welcome'
			>;
			eventSize?: 'intimate' | 'small' | 'medium' | 'large' | null;
			coverImageUrl?: string | null;
		};

		// Calculate end time if duration is provided instead
		let calculatedEndTime = endTime;
		if (!endTime && durationMinutes) {
			const startDate = new Date(startTime);
			const endDate = new Date(startDate.getTime() + durationMinutes * 60000);
			calculatedEndTime = endDate.toISOString();
		}

		// Auto-calculate event size from capacity if not manually set
		const finalEventSize = eventSize || calculateEventSize(capacity || null);

		// Insert event into database
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const { data: event, error } = await (locals.supabase as any)
			.from('events')
			.insert({
				creator_id: session.data.session.user.id,
				group_id: groupId || null,
				title,
				description,
				event_type: eventType,
				visibility: visibility || 'public',
				start_time: startTime,
				end_time: calculatedEndTime || null,
				venue_name: venueName || null,
				venue_address: venueAddress || null,
				venue_lat: venueLat || null,
				venue_lng: venueLng || null,
				video_link: videoLink || null,
				capacity: capacity || null,
				format_tags: formatTags || [],
				accessibility_tags: accessibilityTags || [],
				event_size: finalEventSize || null,
				cover_image_url: coverImageUrl || null
			})
			.select()
			.single();

		if (error) {
			// Log error for debugging (in production, use proper logging service)
			if (process.env.NODE_ENV !== 'production') {
				// eslint-disable-next-line no-console
				console.error('Error creating event:', error);
			}
			return fail(500, {
				form: {
					...form,
					errors: {
						_errors: ['Failed to create event. Please try again.']
					}
				}
			});
		}

		// Redirect to the event page
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		throw redirect(303, `/events/${(event as any).id}`);
	}
};
