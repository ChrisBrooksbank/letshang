// Tests for search page server
// Validates search page load function

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { load } from './+page.server';
import * as searchModule from '$lib/server/search';

// Mock search module
vi.mock('$lib/server/search', () => ({
	search: vi.fn()
}));

describe('Search Page Server', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('load function', () => {
		it('should return empty results when no query is provided', async () => {
			const mockUrl = new URL('http://localhost:5173/search');
			const mockLocals = {
				session: {
					user: { id: 'user-1' }
				}
			};

			const result = await load({
				url: mockUrl,
				locals: mockLocals
			} as never);

			expect(result.query).toBe('');
			expect(result.results.events).toEqual([]);
			expect(result.results.groups).toEqual([]);
			expect(result.error).toBe(null);
		});

		it('should return empty results when query is whitespace only', async () => {
			const mockUrl = new URL('http://localhost:5173/search?q=%20%20%20');
			const mockLocals = {
				session: {
					user: { id: 'user-1' }
				}
			};

			const result = await load({
				url: mockUrl,
				locals: mockLocals
			} as never);

			// rawQuery is returned as-is even if validation fails
			expect(result.query).toBe('   ');
			expect(result.results.events).toEqual([]);
			expect(result.results.groups).toEqual([]);
		});

		it('should perform search with valid query', async () => {
			const mockResults = {
				events: [
					{
						id: 'event-1',
						title: 'Yoga Class',
						description: 'Morning yoga',
						event_type: 'in_person',
						start_time: '2026-02-01T10:00:00Z',
						end_time: '2026-02-01T11:00:00Z',
						venue_name: 'Park',
						venue_address: '123 St',
						capacity: 20,
						cover_image_url: null,
						visibility: 'public',
						creator_id: 'user-1',
						group_id: null,
						event_size: 'small'
					}
				],
				groups: [],
				eventsCount: 1,
				groupsCount: 0
			};

			vi.mocked(searchModule.search).mockResolvedValue(mockResults);

			const mockUrl = new URL('http://localhost:5173/search?q=yoga');
			const mockLocals = {
				session: {
					user: { id: 'user-1' }
				}
			};

			const result = await load({
				url: mockUrl,
				locals: mockLocals
			} as never);

			expect(result.query).toBe('yoga');
			expect(result.results.events).toHaveLength(1);
			expect(result.results.eventsCount).toBe(1);
			expect(result.error).toBe(null);
			expect(searchModule.search).toHaveBeenCalledWith('yoga', 'user-1', {
				eventType: undefined,
				startDate: undefined,
				endDate: undefined,
				eventSize: undefined
			});
		});

		it('should work with unauthenticated users', async () => {
			const mockResults = {
				events: [],
				groups: [],
				eventsCount: 0,
				groupsCount: 0
			};

			vi.mocked(searchModule.search).mockResolvedValue(mockResults);

			const mockUrl = new URL('http://localhost:5173/search?q=yoga');
			const mockLocals = {
				session: null
			};

			const result = await load({
				url: mockUrl,
				locals: mockLocals
			} as never);

			expect(result.query).toBe('yoga');
			expect(searchModule.search).toHaveBeenCalledWith('yoga', null, {
				eventType: undefined,
				startDate: undefined,
				endDate: undefined,
				eventSize: undefined
			});
		});

		it('should handle search errors gracefully', async () => {
			vi.mocked(searchModule.search).mockRejectedValue(new Error('Database error'));

			const mockUrl = new URL('http://localhost:5173/search?q=test');
			const mockLocals = {
				session: {
					user: { id: 'user-1' }
				}
			};

			const result = await load({
				url: mockUrl,
				locals: mockLocals
			} as never);

			expect(result.query).toBe('test');
			expect(result.results.events).toEqual([]);
			expect(result.results.groups).toEqual([]);
			expect(result.error).toBe('Failed to perform search. Please try again.');
		});

		it('should reject query longer than 100 characters', async () => {
			const longQuery = 'a'.repeat(101);
			const mockUrl = new URL(`http://localhost:5173/search?q=${longQuery}`);
			const mockLocals = {
				session: {
					user: { id: 'user-1' }
				}
			};

			const result = await load({
				url: mockUrl,
				locals: mockLocals
			} as never);

			expect(result.results.events).toEqual([]);
			expect(result.results.groups).toEqual([]);
			expect(searchModule.search).not.toHaveBeenCalled();
		});

		it('should decode URL-encoded queries', async () => {
			const mockResults = {
				events: [],
				groups: [],
				eventsCount: 0,
				groupsCount: 0
			};

			vi.mocked(searchModule.search).mockResolvedValue(mockResults);

			const mockUrl = new URL('http://localhost:5173/search?q=yoga%20%26%20meditation');
			const mockLocals = {
				session: {
					user: { id: 'user-1' }
				}
			};

			const result = await load({
				url: mockUrl,
				locals: mockLocals
			} as never);

			expect(result.query).toBe('yoga & meditation');
			expect(searchModule.search).toHaveBeenCalledWith('yoga & meditation', 'user-1', {
				eventType: undefined,
				startDate: undefined,
				endDate: undefined,
				eventSize: undefined
			});
		});

		it('should return both events and groups in results', async () => {
			const mockResults = {
				events: [
					{
						id: 'event-1',
						title: 'Test Event',
						description: 'Event description',
						event_type: 'online',
						start_time: '2026-02-01T10:00:00Z',
						end_time: '2026-02-01T11:00:00Z',
						venue_name: null,
						venue_address: null,
						capacity: null,
						cover_image_url: null,
						visibility: 'public',
						creator_id: 'user-1',
						group_id: null,
						event_size: null
					}
				],
				groups: [
					{
						id: 'group-1',
						name: 'Test Group',
						description: 'Group description',
						cover_image_url: null,
						group_type: 'public',
						location: 'Seattle',
						organizer_id: 'user-1'
					}
				],
				eventsCount: 1,
				groupsCount: 1
			};

			vi.mocked(searchModule.search).mockResolvedValue(mockResults);

			const mockUrl = new URL('http://localhost:5173/search?q=test');
			const mockLocals = {
				session: {
					user: { id: 'user-1' }
				}
			};

			const result = await load({
				url: mockUrl,
				locals: mockLocals
			} as never);

			expect(result.results.events).toHaveLength(1);
			expect(result.results.groups).toHaveLength(1);
			expect(result.results.eventsCount).toBe(1);
			expect(result.results.groupsCount).toBe(1);
		});
	});

	describe('filters', () => {
		it('should pass event type filter to search function', async () => {
			const mockResults = {
				events: [],
				groups: [],
				eventsCount: 0,
				groupsCount: 0
			};

			vi.mocked(searchModule.search).mockResolvedValue(mockResults);

			const mockUrl = new URL('http://localhost:5173/search?q=yoga&eventType=online');
			const mockLocals = {
				session: {
					user: { id: 'user-1' }
				}
			};

			const result = await load({
				url: mockUrl,
				locals: mockLocals
			} as never);

			expect(result.filters.eventType).toBe('online');
			expect(searchModule.search).toHaveBeenCalledWith('yoga', 'user-1', {
				eventType: 'online',
				startDate: undefined,
				endDate: undefined,
				eventSize: undefined
			});
		});

		it('should pass date range filters to search function', async () => {
			const mockResults = {
				events: [],
				groups: [],
				eventsCount: 0,
				groupsCount: 0
			};

			vi.mocked(searchModule.search).mockResolvedValue(mockResults);

			const mockUrl = new URL(
				'http://localhost:5173/search?q=event&startDate=2026-02-01&endDate=2026-02-28'
			);
			const mockLocals = {
				session: {
					user: { id: 'user-1' }
				}
			};

			const result = await load({
				url: mockUrl,
				locals: mockLocals
			} as never);

			expect(result.filters.startDate).toBe('2026-02-01');
			expect(result.filters.endDate).toBe('2026-02-28');
			expect(searchModule.search).toHaveBeenCalledWith('event', 'user-1', {
				eventType: undefined,
				startDate: '2026-02-01T00:00:00.000Z',
				endDate: '2026-02-28T23:59:59.999Z',
				eventSize: undefined
			});
		});

		it('should pass event size filter to search function', async () => {
			const mockResults = {
				events: [],
				groups: [],
				eventsCount: 0,
				groupsCount: 0
			};

			vi.mocked(searchModule.search).mockResolvedValue(mockResults);

			const mockUrl = new URL('http://localhost:5173/search?q=meetup&eventSize=intimate');
			const mockLocals = {
				session: {
					user: { id: 'user-1' }
				}
			};

			const result = await load({
				url: mockUrl,
				locals: mockLocals
			} as never);

			expect(result.filters.eventSize).toBe('intimate');
			expect(searchModule.search).toHaveBeenCalledWith('meetup', 'user-1', {
				eventType: undefined,
				startDate: undefined,
				endDate: undefined,
				eventSize: 'intimate'
			});
		});

		it('should pass multiple filters simultaneously', async () => {
			const mockResults = {
				events: [],
				groups: [],
				eventsCount: 0,
				groupsCount: 0
			};

			vi.mocked(searchModule.search).mockResolvedValue(mockResults);

			const mockUrl = new URL(
				'http://localhost:5173/search?q=yoga&eventType=in_person&startDate=2026-02-01&endDate=2026-02-28&eventSize=small'
			);
			const mockLocals = {
				session: {
					user: { id: 'user-1' }
				}
			};

			const result = await load({
				url: mockUrl,
				locals: mockLocals
			} as never);

			expect(result.filters.eventType).toBe('in_person');
			expect(result.filters.startDate).toBe('2026-02-01');
			expect(result.filters.endDate).toBe('2026-02-28');
			expect(result.filters.eventSize).toBe('small');
			expect(searchModule.search).toHaveBeenCalledWith('yoga', 'user-1', {
				eventType: 'in_person',
				startDate: '2026-02-01T00:00:00.000Z',
				endDate: '2026-02-28T23:59:59.999Z',
				eventSize: 'small'
			});
		});

		it('should return error when filter validation fails', async () => {
			const mockUrl = new URL(
				'http://localhost:5173/search?q=yoga&eventType=invalid&startDate=not-a-date'
			);
			const mockLocals = {
				session: {
					user: { id: 'user-1' }
				}
			};

			const result = await load({
				url: mockUrl,
				locals: mockLocals
			} as never);

			expect(result.error).toBe('Invalid search parameters');
			expect(result.results.events).toEqual([]);
			expect(searchModule.search).not.toHaveBeenCalled();
		});

		it('should handle missing filters gracefully', async () => {
			const mockResults = {
				events: [],
				groups: [],
				eventsCount: 0,
				groupsCount: 0
			};

			vi.mocked(searchModule.search).mockResolvedValue(mockResults);

			const mockUrl = new URL('http://localhost:5173/search?q=test');
			const mockLocals = {
				session: {
					user: { id: 'user-1' }
				}
			};

			const result = await load({
				url: mockUrl,
				locals: mockLocals
			} as never);

			expect(result.filters.eventType).toBe(null);
			expect(result.filters.startDate).toBe(null);
			expect(result.filters.endDate).toBe(null);
			expect(result.filters.eventSize).toBe(null);
			expect(searchModule.search).toHaveBeenCalledWith('test', 'user-1', {
				eventType: undefined,
				startDate: undefined,
				endDate: undefined,
				eventSize: undefined
			});
		});

		it('should convert date input format (YYYY-MM-DD) to ISO datetime for validation', async () => {
			const mockResults = {
				events: [],
				groups: [],
				eventsCount: 0,
				groupsCount: 0
			};

			vi.mocked(searchModule.search).mockResolvedValue(mockResults);

			// HTML date input returns YYYY-MM-DD format
			const mockUrl = new URL(
				'http://localhost:5173/search?q=event&startDate=2026-02-01&endDate=2026-02-28'
			);
			const mockLocals = {
				session: {
					user: { id: 'user-1' }
				}
			};

			const result = await load({
				url: mockUrl,
				locals: mockLocals
			} as never);

			// Should return raw date to UI
			expect(result.filters.startDate).toBe('2026-02-01');
			expect(result.filters.endDate).toBe('2026-02-28');

			// Should pass ISO datetime to search function
			expect(searchModule.search).toHaveBeenCalledWith('event', 'user-1', {
				eventType: undefined,
				startDate: '2026-02-01T00:00:00.000Z',
				endDate: '2026-02-28T23:59:59.999Z',
				eventSize: undefined
			});
		});

		it('should handle date range with single date (start only)', async () => {
			const mockResults = {
				events: [],
				groups: [],
				eventsCount: 0,
				groupsCount: 0
			};

			vi.mocked(searchModule.search).mockResolvedValue(mockResults);

			const mockUrl = new URL('http://localhost:5173/search?q=event&startDate=2026-02-01');
			const mockLocals = {
				session: {
					user: { id: 'user-1' }
				}
			};

			const result = await load({
				url: mockUrl,
				locals: mockLocals
			} as never);

			expect(result.filters.startDate).toBe('2026-02-01');
			expect(result.filters.endDate).toBe(null);
			expect(searchModule.search).toHaveBeenCalledWith('event', 'user-1', {
				eventType: undefined,
				startDate: '2026-02-01T00:00:00.000Z',
				endDate: undefined,
				eventSize: undefined
			});
		});

		it('should handle date range with single date (end only)', async () => {
			const mockResults = {
				events: [],
				groups: [],
				eventsCount: 0,
				groupsCount: 0
			};

			vi.mocked(searchModule.search).mockResolvedValue(mockResults);

			const mockUrl = new URL('http://localhost:5173/search?q=event&endDate=2026-02-28');
			const mockLocals = {
				session: {
					user: { id: 'user-1' }
				}
			};

			const result = await load({
				url: mockUrl,
				locals: mockLocals
			} as never);

			expect(result.filters.startDate).toBe(null);
			expect(result.filters.endDate).toBe('2026-02-28');
			expect(searchModule.search).toHaveBeenCalledWith('event', 'user-1', {
				eventType: undefined,
				startDate: undefined,
				endDate: '2026-02-28T23:59:59.999Z',
				eventSize: undefined
			});
		});

		it('should convert dates with all filters', async () => {
			const mockResults = {
				events: [],
				groups: [],
				eventsCount: 0,
				groupsCount: 0
			};

			vi.mocked(searchModule.search).mockResolvedValue(mockResults);

			const mockUrl = new URL(
				'http://localhost:5173/search?q=yoga&eventType=in_person&startDate=2026-02-01&endDate=2026-02-28&eventSize=small'
			);
			const mockLocals = {
				session: {
					user: { id: 'user-1' }
				}
			};

			const result = await load({
				url: mockUrl,
				locals: mockLocals
			} as never);

			expect(result.filters.eventType).toBe('in_person');
			expect(result.filters.startDate).toBe('2026-02-01');
			expect(result.filters.endDate).toBe('2026-02-28');
			expect(result.filters.eventSize).toBe('small');
			expect(searchModule.search).toHaveBeenCalledWith('yoga', 'user-1', {
				eventType: 'in_person',
				startDate: '2026-02-01T00:00:00.000Z',
				endDate: '2026-02-28T23:59:59.999Z',
				eventSize: 'small'
			});
		});
	});
});
