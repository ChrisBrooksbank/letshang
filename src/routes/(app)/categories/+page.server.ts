import { fetchCategoryStats } from '$lib/server/categories';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const categoryStats = await fetchCategoryStats();

	return {
		categoryStats
	};
};
