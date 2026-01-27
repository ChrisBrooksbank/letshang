import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { fetchUserCalendarEvents, fetchUserGroups } from '$lib/server/calendar';

export const load: PageServerLoad = async ({ locals, url }) => {
	const session = locals.session;
	if (!session?.user) {
		throw redirect(303, '/login');
	}

	// Get filter parameters from URL
	const groupId = url.searchParams.get('group') || undefined;
	const view = url.searchParams.get('view') || 'month';
	const startDate = url.searchParams.get('startDate') || undefined;
	const endDate = url.searchParams.get('endDate') || undefined;

	// Fetch events (default to showing "going" and "interested" events only)
	const { events, error: eventsError } = await fetchUserCalendarEvents(session.user.id, {
		startDate,
		endDate,
		groupId,
		statuses: ['going', 'interested']
	});

	if (eventsError) {
		// Don't fail the page, just show empty calendar
		// eslint-disable-next-line no-console
		console.error('Error fetching calendar events:', eventsError);
	}

	// Fetch user's groups for filtering
	const { groups, error: groupsError } = await fetchUserGroups(session.user.id);

	if (groupsError) {
		// Don't fail the page
		// eslint-disable-next-line no-console
		console.error('Error fetching user groups:', groupsError);
	}

	return {
		events,
		groups,
		view,
		selectedGroupId: groupId || null
	};
};
