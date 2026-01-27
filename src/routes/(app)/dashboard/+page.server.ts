import { supabaseAdmin } from '$lib/server/supabase';
import { fetchHappeningNowEvents } from '$lib/server/happening-now';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	try {
		const happeningNowEvents = await fetchHappeningNowEvents(supabaseAdmin, 10);

		return {
			happeningNowEvents
		};
	} catch {
		// Silently return empty array on error
		return {
			happeningNowEvents: []
		};
	}
};
