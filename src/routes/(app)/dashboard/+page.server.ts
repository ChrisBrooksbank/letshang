import { supabaseAdmin } from '$lib/server/supabase';
import { fetchHappeningNowEvents } from '$lib/server/happening-now';
import { fetchHappeningTodayEvents } from '$lib/server/happening-today';
import { fetchNearbyEvents, fetchUserLocation } from '$lib/server/nearby-events';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	try {
		const session = await locals.supabase.auth.getSession();
		const userId = session.data.session?.user?.id;

		// Fetch location-based recommendations if user has a saved location
		let nearbyEvents: Awaited<ReturnType<typeof fetchNearbyEvents>> = [];
		if (userId) {
			try {
				const userLocation = await fetchUserLocation(locals.supabase, userId);
				if (userLocation) {
					nearbyEvents = await fetchNearbyEvents(locals.supabase, userLocation, 25, 10);
				}
			} catch {
				// Silently handle location fetch errors
				nearbyEvents = [];
			}
		}

		const [happeningNowEvents, happeningTodayEvents] = await Promise.all([
			fetchHappeningNowEvents(supabaseAdmin, 10),
			fetchHappeningTodayEvents(supabaseAdmin, 20)
		]);

		return {
			happeningNowEvents,
			happeningTodayEvents,
			nearbyEvents
		};
	} catch {
		// Silently return empty arrays on error
		return {
			happeningNowEvents: [],
			happeningTodayEvents: [],
			nearbyEvents: []
		};
	}
};
