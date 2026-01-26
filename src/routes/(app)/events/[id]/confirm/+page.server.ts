import { error, fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { confirmAttendance } from '$lib/server/confirmation-ping';

export const load: PageServerLoad = async ({ params, url, locals }) => {
	const session = locals.session;
	if (!session?.user) {
		throw redirect(303, `/login?redirectTo=/events/${params.id}/confirm${url.search}`);
	}

	const rsvpId = url.searchParams.get('rsvp');
	if (!rsvpId) {
		throw error(400, 'Missing RSVP ID');
	}

	return {
		rsvpId,
		eventId: params.id
	};
};

export const actions = {
	default: async ({ request, locals, params }) => {
		const session = locals.session;
		if (!session?.user) {
			return fail(401, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const rsvpId = formData.get('rsvpId');

		if (!rsvpId || typeof rsvpId !== 'string') {
			return fail(400, { error: 'Invalid RSVP ID' });
		}

		try {
			await confirmAttendance(rsvpId, session.user.id);

			// Redirect back to event page
			throw redirect(303, `/events/${params.id}?confirmed=true`);
		} catch (e) {
			// eslint-disable-next-line no-console
			console.error('Error confirming attendance:', { message: (e as Error).message });
			return {
				success: false,
				error: e instanceof Error ? e.message : 'Failed to confirm attendance'
			};
		}
	}
} satisfies Actions;
