import { describe, it, expect, vi, beforeEach } from 'vitest';
import { error } from '@sveltejs/kit';
import { load } from './+page.server';
import * as categoriesModule from '$lib/server/categories';
import { CATEGORY_METADATA } from '$lib/schemas/categories';

// Mock category functions
vi.mock('$lib/server/categories', () => ({
	fetchGroupsByCategory: vi.fn(),
	fetchEventsByCategory: vi.fn(),
	getCategoryBySlug: vi.fn()
}));

// Mock SvelteKit error
vi.mock('@sveltejs/kit', () => ({
	error: vi.fn((status: number, message: string) => {
		const err = new Error(message) as Error & { status: number };
		err.status = status;
		throw err;
	})
}));

describe('Category Detail Page Server', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('load', () => {
		it('should load category with groups and events', async () => {
			const mockGroups = [
				{
					id: 'group-1',
					name: 'Tech Group',
					description: 'A tech group',
					cover_image_url: null,
					group_type: 'public',
					created_at: '2026-01-26T00:00:00Z',
					member_count: 10,
					topics: [{ id: 'topic-1', name: 'Web Dev', slug: 'web-dev' }]
				}
			];

			const mockEvents: unknown[] = [];

			vi.mocked(categoriesModule.fetchGroupsByCategory).mockResolvedValue(mockGroups as never);
			vi.mocked(categoriesModule.fetchEventsByCategory).mockResolvedValue(mockEvents as never);

			const result = (await load({ params: { slug: 'tech' } } as never)) as {
				category: typeof CATEGORY_METADATA.Tech;
				groups: typeof mockGroups;
				events: typeof mockEvents;
			};

			expect(result.category).toEqual(CATEGORY_METADATA.Tech);
			expect(result.groups).toEqual(mockGroups);
			expect(result.events).toEqual(mockEvents);
		});

		it('should throw 404 for invalid category slug', async () => {
			await expect(load({ params: { slug: 'invalid' } } as never)).rejects.toThrow(
				'Category not found'
			);

			expect(error).toHaveBeenCalledWith(404, 'Category not found');
		});

		it('should handle all valid category slugs', async () => {
			const validSlugs = ['tech', 'sports', 'arts', 'social', 'career'];

			vi.mocked(categoriesModule.fetchGroupsByCategory).mockResolvedValue([]);
			vi.mocked(categoriesModule.fetchEventsByCategory).mockResolvedValue([]);

			for (const slug of validSlugs) {
				const result = (await load({ params: { slug } } as never)) as {
					category: { slug: string };
				};
				expect(result.category).toBeDefined();
				expect(result.category.slug).toBe(slug);
			}
		});

		it('should fetch groups and events in parallel', async () => {
			const fetchGroupsSpy = vi
				.mocked(categoriesModule.fetchGroupsByCategory)
				.mockResolvedValue([]);
			const fetchEventsSpy = vi
				.mocked(categoriesModule.fetchEventsByCategory)
				.mockResolvedValue([]);

			await load({ params: { slug: 'tech' } } as never);

			// Both should be called
			expect(fetchGroupsSpy).toHaveBeenCalledOnce();
			expect(fetchEventsSpy).toHaveBeenCalledOnce();
		});

		it('should propagate errors from fetchGroupsByCategory', async () => {
			vi.mocked(categoriesModule.fetchGroupsByCategory).mockRejectedValue(
				new Error('Database error')
			);
			vi.mocked(categoriesModule.fetchEventsByCategory).mockResolvedValue([]);

			await expect(load({ params: { slug: 'tech' } } as never)).rejects.toThrow('Database error');
		});

		it('should propagate errors from fetchEventsByCategory', async () => {
			vi.mocked(categoriesModule.fetchGroupsByCategory).mockResolvedValue([]);
			vi.mocked(categoriesModule.fetchEventsByCategory).mockRejectedValue(
				new Error('Database error')
			);

			await expect(load({ params: { slug: 'tech' } } as never)).rejects.toThrow('Database error');
		});

		it('should handle empty groups and events', async () => {
			vi.mocked(categoriesModule.fetchGroupsByCategory).mockResolvedValue([]);
			vi.mocked(categoriesModule.fetchEventsByCategory).mockResolvedValue([]);

			const result = (await load({ params: { slug: 'tech' } } as never)) as {
				groups: unknown[];
				events: unknown[];
			};

			expect(result.groups).toEqual([]);
			expect(result.events).toEqual([]);
		});
	});
});
