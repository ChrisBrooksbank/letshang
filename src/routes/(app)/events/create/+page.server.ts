import { fail, redirect, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { eventCreationSchema } from '$lib/schemas/events';

export const load: PageServerLoad = async ({ locals }) => {
	// Ensure user is authenticated
	const session = await locals.supabase.auth.getSession();
	if (!session.data.session) {
		throw redirect(303, '/login');
	}

	// Initialize empty form
	// @ts-expect-error - zod adapter type compatibility issue
	const form = await superValidate(null, zod(eventCreationSchema));
	return { form };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		// Ensure user is authenticated
		const session = await locals.supabase.auth.getSession();
		if (!session.data.session) {
			throw redirect(303, '/login');
		}

		// Validate form data
		// @ts-expect-error - zod adapter type compatibility issue
		const form = await superValidate(request, zod(eventCreationSchema));

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
			venueAddress
		} = form.data as {
			title: string;
			description: string;
			eventType: 'in_person' | 'online' | 'hybrid';
			startTime: string;
			endTime?: string;
			durationMinutes?: number;
			venueName?: string;
			venueAddress?: string;
		};

		// Calculate end time if duration is provided instead
		let calculatedEndTime = endTime;
		if (!endTime && durationMinutes) {
			const startDate = new Date(startTime);
			const endDate = new Date(startDate.getTime() + durationMinutes * 60000);
			calculatedEndTime = endDate.toISOString();
		}

		// Insert event into database
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const { data: event, error } = await (locals.supabase as any)
			.from('events')
			.insert({
				creator_id: session.data.session.user.id,
				title,
				description,
				event_type: eventType,
				start_time: startTime,
				end_time: calculatedEndTime || null,
				venue_name: venueName || null,
				venue_address: venueAddress || null
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
