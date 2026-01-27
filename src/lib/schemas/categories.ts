import { z } from 'zod';

/**
 * Valid category names from the database
 * Matches the categories in topics table (see: supabase/migrations/20260123_groups_schema.sql)
 */
export const categoryNames = ['Tech', 'Sports', 'Arts', 'Social', 'Career'] as const;

export const categoryEnum = z.enum(categoryNames);

export type Category = z.infer<typeof categoryEnum>;

/**
 * Category metadata for display
 */
export interface CategoryMetadata {
	name: Category;
	slug: string;
	description: string;
	icon: string; // Emoji or icon identifier
}

/**
 * Category display information
 */
export const CATEGORY_METADATA: Record<Category, CategoryMetadata> = {
	Tech: {
		name: 'Tech',
		slug: 'tech',
		description: 'Software, AI, data science, and everything technology',
		icon: '💻'
	},
	Sports: {
		name: 'Sports',
		slug: 'sports',
		description: 'Running, cycling, team sports, and fitness activities',
		icon: '⚽'
	},
	Arts: {
		name: 'Arts',
		slug: 'arts',
		description: 'Music, photography, writing, theater, and creative pursuits',
		icon: '🎨'
	},
	Social: {
		name: 'Social',
		slug: 'social',
		description: 'Book clubs, board games, dining, and casual hangouts',
		icon: '🎲'
	},
	Career: {
		name: 'Career',
		slug: 'career',
		description: 'Professional development, networking, and entrepreneurship',
		icon: '💼'
	}
};

/**
 * Helper to get category by slug
 */
export function getCategoryBySlug(slug: string): CategoryMetadata | undefined {
	return Object.values(CATEGORY_METADATA).find((cat) => cat.slug === slug);
}

/**
 * Helper to get all category slugs
 */
export function getAllCategorySlugs(): string[] {
	return Object.values(CATEGORY_METADATA).map((cat) => cat.slug);
}
