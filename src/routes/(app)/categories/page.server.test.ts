import { describe, it, expect, vi, beforeEach } from 'vitest';
import { load } from './+page.server';
import * as categoriesModule from '$lib/server/categories';

// Mock category functions
vi.mock('$lib/server/categories', () => ({
	fetchCategoryStats: vi.fn()
}));

describe('Categories Index Page Server', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('load', () => {
		it('should fetch category stats', async () => {
			const mockStats = [
				{ category: 'Tech', groupCount: 10, eventCount: 5, topicCount: 5 },
				{ category: 'Sports', groupCount: 8, eventCount: 3, topicCount: 6 }
			];

			vi.mocked(categoriesModule.fetchCategoryStats).mockResolvedValue(mockStats as never);

			const result = (await load({} as never)) as { categoryStats: typeof mockStats };

			expect(result.categoryStats).toEqual(mockStats);
			expect(categoriesModule.fetchCategoryStats).toHaveBeenCalledOnce();
		});

		it('should return empty array when no categories exist', async () => {
			vi.mocked(categoriesModule.fetchCategoryStats).mockResolvedValue([]);

			const result = (await load({} as never)) as { categoryStats: unknown[] };

			expect(result.categoryStats).toEqual([]);
		});

		it('should propagate errors from fetchCategoryStats', async () => {
			vi.mocked(categoriesModule.fetchCategoryStats).mockRejectedValue(new Error('Database error'));

			await expect(load({} as never)).rejects.toThrow('Database error');
		});
	});
});
