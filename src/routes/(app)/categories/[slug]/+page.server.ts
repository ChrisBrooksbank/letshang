import { error } from '@sveltejs/kit';
import { getCategoryBySlug } from '$lib/schemas/categories';
import { fetchGroupsByCategory, fetchEventsByCategory } from '$lib/server/categories';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const { slug } = params;

	// Validate category slug
	const category = getCategoryBySlug(slug);
	if (!category) {
		throw error(404, 'Category not found');
	}

	// Fetch groups and events for this category
	const [groups, events] = await Promise.all([
		fetchGroupsByCategory(category.name, 20, 0),
		fetchEventsByCategory(category.name, 20, 0)
	]);

	return {
		category,
		groups,
		events
	};
};
