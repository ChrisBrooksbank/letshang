import { supabaseAdmin } from '$lib/server/supabase';
import { fetchHappeningNowEvents } from '$lib/server/happening-now';
import { fetchHappeningTodayEvents } from '$lib/server/happening-today';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	try {
		const [happeningNowEvents, happeningTodayEvents] = await Promise.all([
			fetchHappeningNowEvents(supabaseAdmin, 10),
			fetchHappeningTodayEvents(supabaseAdmin, 20)
		]);

		return {
			happeningNowEvents,
			happeningTodayEvents
		};
	} catch {
		// Silently return empty arrays on error
		return {
			happeningNowEvents: [],
			happeningTodayEvents: []
		};
	}
};
