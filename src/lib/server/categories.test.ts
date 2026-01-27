import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchCategoryStats, fetchGroupsByCategory, fetchEventsByCategory } from './categories';
import { supabase } from './supabase';

// Mock Supabase
vi.mock('./supabase', () => ({
	supabase: {
		from: vi.fn()
	}
}));

describe('Category Server Functions', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('fetchCategoryStats', () => {
		it('should fetch and aggregate category statistics', async () => {
			// Mock topics fetch
			const mockTopics = [
				{ id: 'topic-1', category: 'Tech' },
				{ id: 'topic-2', category: 'Tech' },
				{ id: 'topic-3', category: 'Sports' }
			];

			const topicsQuery = {
				select: vi.fn().mockReturnThis(),
				data: mockTopics,
				error: null
			};

			// Mock group_topics count
			const groupTopicsQuery = {
				select: vi.fn().mockReturnThis(),
				in: vi.fn().mockReturnThis(),
				count: 5,
				error: null
			};

			vi.mocked(supabase.from).mockImplementation((table: string) => {
				if (table === 'topics') {
					return topicsQuery as never;
				}
				if (table === 'group_topics') {
					return groupTopicsQuery as never;
				}
				return {} as never;
			});

			const stats = await fetchCategoryStats();

			expect(stats).toBeDefined();
			expect(Array.isArray(stats)).toBe(true);
		});

		it('should handle empty topics', async () => {
			const topicsQuery = {
				select: vi.fn().mockReturnThis(),
				data: [],
				error: null
			};

			vi.mocked(supabase.from).mockReturnValue(topicsQuery as never);

			const stats = await fetchCategoryStats();
			expect(stats).toEqual([]);
		});

		it('should throw error on topics fetch failure', async () => {
			const topicsQuery = {
				select: vi.fn().mockReturnThis(),
				data: null,
				error: { message: 'Database error' }
			};

			vi.mocked(supabase.from).mockReturnValue(topicsQuery as never);

			await expect(fetchCategoryStats()).rejects.toThrow('Failed to fetch category data');
		});

		it('should sort categories by group count descending', async () => {
			const mockTopics = [
				{ id: 'topic-1', category: 'Tech' },
				{ id: 'topic-2', category: 'Sports' }
			];

			const topicsQuery = {
				select: vi.fn().mockReturnThis(),
				data: mockTopics,
				error: null
			};

			let callCount = 0;
			const groupTopicsQuery = {
				select: vi.fn().mockReturnThis(),
				in: vi.fn().mockReturnThis(),
				get count() {
					callCount++;
					return callCount === 1 ? 10 : 5; // Tech has 10, Sports has 5
				},
				error: null
			};

			vi.mocked(supabase.from).mockImplementation((table: string) => {
				if (table === 'topics') return topicsQuery as never;
				if (table === 'group_topics') return groupTopicsQuery as never;
				return {} as never;
			});

			const stats = await fetchCategoryStats();
			expect(stats[0].groupCount).toBeGreaterThanOrEqual(stats[stats.length - 1].groupCount);
		});
	});

	describe('fetchGroupsByCategory', () => {
		it('should fetch groups for a category', async () => {
			const mockTopics = [{ id: 'topic-1' }];
			const mockGroupTopics = [{ group_id: 'group-1' }];
			const mockGroups = [
				{
					id: 'group-1',
					name: 'Test Group',
					description: 'Test',
					cover_image_url: null,
					group_type: 'public',
					created_at: '2026-01-26T00:00:00Z',
					group_topics: [{ topics: { id: 'topic-1', name: 'Topic 1', slug: 'topic-1' } }]
				}
			];

			const topicsQuery = {
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				data: mockTopics,
				error: null
			};

			const groupTopicsQuery = {
				select: vi.fn().mockReturnThis(),
				in: vi.fn().mockReturnThis(),
				data: mockGroupTopics,
				error: null
			};

			const groupsQuery = {
				select: vi.fn().mockReturnThis(),
				in: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				order: vi.fn().mockReturnThis(),
				range: vi.fn().mockReturnThis(),
				data: mockGroups,
				error: null
			};

			const memberCountQuery = {
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockImplementation((field: string, _value: string) => {
					if (field === 'status') return memberCountQuery;
					return memberCountQuery;
				}),
				count: 5,
				error: null
			};

			vi.mocked(supabase.from).mockImplementation((table: string) => {
				if (table === 'topics') return topicsQuery as never;
				if (table === 'group_topics') return groupTopicsQuery as never;
				if (table === 'groups') return groupsQuery as never;
				if (table === 'group_members') return memberCountQuery as never;
				return {} as never;
			});

			const groups = await fetchGroupsByCategory('Tech', 20, 0);

			expect(groups).toBeDefined();
			expect(Array.isArray(groups)).toBe(true);
			expect(groups.length).toBeGreaterThan(0);
			expect(groups[0]).toHaveProperty('member_count');
		});

		it('should handle topics without category field', async () => {
			const mockTopics = [
				{ id: 'topic-1', category: 'Tech' },
				{ id: 'topic-2', category: null }
			];

			const topicsQuery = {
				select: vi.fn().mockReturnThis(),
				data: mockTopics,
				error: null
			};

			const groupTopicsQuery = {
				select: vi.fn().mockReturnThis(),
				in: vi.fn().mockReturnThis(),
				count: 5,
				error: null
			};

			vi.mocked(supabase.from).mockImplementation((table: string) => {
				if (table === 'topics') return topicsQuery as never;
				if (table === 'group_topics') return groupTopicsQuery as never;
				return {} as never;
			});

			const stats = await fetchCategoryStats();
			// Only 'Tech' category should be included
			expect(stats.some((s) => s.category === 'Tech')).toBe(true);
		});

		it('should handle group count errors gracefully', async () => {
			const mockTopics = [{ id: 'topic-1', category: 'Tech' }];

			const topicsQuery = {
				select: vi.fn().mockReturnThis(),
				data: mockTopics,
				error: null
			};

			const groupTopicsQuery = {
				select: vi.fn().mockReturnThis(),
				in: vi.fn().mockReturnThis(),
				count: null,
				error: { message: 'Database error' }
			};

			vi.mocked(supabase.from).mockImplementation((table: string) => {
				if (table === 'topics') return topicsQuery as never;
				if (table === 'group_topics') return groupTopicsQuery as never;
				return {} as never;
			});

			const stats = await fetchCategoryStats();
			// Category should be skipped due to error
			expect(stats.length).toBe(0);
		});

		it('should return empty array if no topics exist', async () => {
			const topicsQuery = {
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				data: [],
				error: null
			};

			vi.mocked(supabase.from).mockReturnValue(topicsQuery as never);

			const groups = await fetchGroupsByCategory('Tech', 20, 0);
			expect(groups).toEqual([]);
		});

		it('should throw error on topics fetch failure', async () => {
			const topicsQuery = {
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				data: null,
				error: { message: 'Database error' }
			};

			vi.mocked(supabase.from).mockReturnValue(topicsQuery as never);

			await expect(fetchGroupsByCategory('Tech', 20, 0)).rejects.toThrow('Failed to fetch groups');
		});

		it('should respect limit and offset parameters', async () => {
			const mockTopics = [{ id: 'topic-1' }];
			const mockGroupTopics = [{ group_id: 'group-1' }];

			const topicsQuery = {
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				data: mockTopics,
				error: null
			};

			const groupTopicsQuery = {
				select: vi.fn().mockReturnThis(),
				in: vi.fn().mockReturnThis(),
				data: mockGroupTopics,
				error: null
			};

			const groupsQuery = {
				select: vi.fn().mockReturnThis(),
				in: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				order: vi.fn().mockReturnThis(),
				range: vi.fn((start: number, end: number) => {
					expect(start).toBe(10);
					expect(end).toBe(19); // offset=10, limit=10, so range is [10, 19]
					return groupsQuery;
				}),
				data: [],
				error: null
			};

			vi.mocked(supabase.from).mockImplementation((table: string) => {
				if (table === 'topics') return topicsQuery as never;
				if (table === 'group_topics') return groupTopicsQuery as never;
				if (table === 'groups') return groupsQuery as never;
				return {} as never;
			});

			await fetchGroupsByCategory('Tech', 10, 10);
		});

		it('should only return public groups', async () => {
			const mockTopics = [{ id: 'topic-1' }];
			const mockGroupTopics = [{ group_id: 'group-1' }];

			const topicsQuery = {
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				data: mockTopics,
				error: null
			};

			const groupTopicsQuery = {
				select: vi.fn().mockReturnThis(),
				in: vi.fn().mockReturnThis(),
				data: mockGroupTopics,
				error: null
			};

			const groupsQuery = {
				select: vi.fn().mockReturnThis(),
				in: vi.fn().mockReturnThis(),
				eq: vi.fn((field: string, value: string) => {
					if (field === 'group_type') {
						expect(value).toBe('public');
					}
					return groupsQuery;
				}),
				order: vi.fn().mockReturnThis(),
				range: vi.fn().mockReturnThis(),
				data: [],
				error: null
			};

			vi.mocked(supabase.from).mockImplementation((table: string) => {
				if (table === 'topics') return topicsQuery as never;
				if (table === 'group_topics') return groupTopicsQuery as never;
				if (table === 'groups') return groupsQuery as never;
				return {} as never;
			});

			await fetchGroupsByCategory('Tech', 20, 0);
		});

		it('should return empty array if no group topics exist', async () => {
			const mockTopics = [{ id: 'topic-1' }];

			const topicsQuery = {
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				data: mockTopics,
				error: null
			};

			const groupTopicsQuery = {
				select: vi.fn().mockReturnThis(),
				in: vi.fn().mockReturnThis(),
				data: [],
				error: null
			};

			vi.mocked(supabase.from).mockImplementation((table: string) => {
				if (table === 'topics') return topicsQuery as never;
				if (table === 'group_topics') return groupTopicsQuery as never;
				return {} as never;
			});

			const groups = await fetchGroupsByCategory('Tech', 20, 0);
			expect(groups).toEqual([]);
		});

		it('should throw error on group topics fetch failure', async () => {
			const mockTopics = [{ id: 'topic-1' }];

			const topicsQuery = {
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				data: mockTopics,
				error: null
			};

			const groupTopicsQuery = {
				select: vi.fn().mockReturnThis(),
				in: vi.fn().mockReturnThis(),
				data: null,
				error: { message: 'Database error' }
			};

			vi.mocked(supabase.from).mockImplementation((table: string) => {
				if (table === 'topics') return topicsQuery as never;
				if (table === 'group_topics') return groupTopicsQuery as never;
				return {} as never;
			});

			await expect(fetchGroupsByCategory('Tech', 20, 0)).rejects.toThrow('Failed to fetch groups');
		});

		it('should throw error on groups fetch failure', async () => {
			const mockTopics = [{ id: 'topic-1' }];
			const mockGroupTopics = [{ group_id: 'group-1' }];

			const topicsQuery = {
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				data: mockTopics,
				error: null
			};

			const groupTopicsQuery = {
				select: vi.fn().mockReturnThis(),
				in: vi.fn().mockReturnThis(),
				data: mockGroupTopics,
				error: null
			};

			const groupsQuery = {
				select: vi.fn().mockReturnThis(),
				in: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				order: vi.fn().mockReturnThis(),
				range: vi.fn().mockReturnThis(),
				data: null,
				error: { message: 'Database error' }
			};

			vi.mocked(supabase.from).mockImplementation((table: string) => {
				if (table === 'topics') return topicsQuery as never;
				if (table === 'group_topics') return groupTopicsQuery as never;
				if (table === 'groups') return groupsQuery as never;
				return {} as never;
			});

			await expect(fetchGroupsByCategory('Tech', 20, 0)).rejects.toThrow('Failed to fetch groups');
		});

		it('should handle null groups data', async () => {
			const mockTopics = [{ id: 'topic-1' }];
			const mockGroupTopics = [{ group_id: 'group-1' }];

			const topicsQuery = {
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				data: mockTopics,
				error: null
			};

			const groupTopicsQuery = {
				select: vi.fn().mockReturnThis(),
				in: vi.fn().mockReturnThis(),
				data: mockGroupTopics,
				error: null
			};

			const groupsQuery = {
				select: vi.fn().mockReturnThis(),
				in: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				order: vi.fn().mockReturnThis(),
				range: vi.fn().mockReturnThis(),
				data: null,
				error: null
			};

			vi.mocked(supabase.from).mockImplementation((table: string) => {
				if (table === 'topics') return topicsQuery as never;
				if (table === 'group_topics') return groupTopicsQuery as never;
				if (table === 'groups') return groupsQuery as never;
				return {} as never;
			});

			const groups = await fetchGroupsByCategory('Tech', 20, 0);
			expect(groups).toEqual([]);
		});
	});

	describe('fetchEventsByCategory', () => {
		it('should return empty array (not yet implemented)', async () => {
			const events = await fetchEventsByCategory('Tech', 20, 0);
			expect(events).toEqual([]);
		});

		it('should accept all valid category parameters', async () => {
			const categories = ['Tech', 'Sports', 'Arts', 'Social', 'Career'] as const;
			for (const category of categories) {
				const events = await fetchEventsByCategory(category, 20, 0);
				expect(Array.isArray(events)).toBe(true);
			}
		});
	});
});
