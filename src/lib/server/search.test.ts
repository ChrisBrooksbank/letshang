// Tests for search functionality
// Validates search logic for events and groups with relevance ranking

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchEvents, searchGroups, search } from './search';
import { supabaseAdmin } from './supabase';
import type { PostgrestSingleResponse, PostgrestError } from '@supabase/supabase-js';

// Mock supabaseAdmin
vi.mock('./supabase', () => ({
	supabaseAdmin: {
		rpc: vi.fn()
	}
}));

// Helper function to create proper mock responses
function mockSuccess<T>(data: T): PostgrestSingleResponse<T> {
	return {
		data,
		error: null,
		count: null,
		status: 200,
		statusText: 'OK'
	};
}

function mockError(message: string): PostgrestSingleResponse<null> {
	const error: PostgrestError = {
		message,
		details: '',
		hint: '',
		code: 'PGRST000',
		name: 'PostgrestError'
	};
	return {
		data: null,
		error,
		count: null,
		status: 400,
		statusText: 'Bad Request'
	};
}

describe('Search Functionality', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('searchEvents', () => {
		it('should return relevance-ranked events matching query', async () => {
			const mockEvents = [
				{
					id: 'event-1',
					title: 'Yoga in the Park',
					description: 'Morning yoga session',
					event_type: 'in_person',
					start_time: '2026-02-01T10:00:00Z',
					venue_name: 'Central Park',
					venue_address: '123 Park Ave',
					capacity: 20,
					cover_image_url: null,
					visibility: 'public',
					creator_id: 'user-1',
					group_id: null,
					rank: 0.95
				}
			];

			vi.mocked(supabaseAdmin.rpc).mockResolvedValue(mockSuccess(mockEvents));

			const results = await searchEvents('yoga', 'user-1');

			expect(results).toHaveLength(1);
			expect(results[0].title).toBe('Yoga in the Park');
			expect(results[0].rank).toBe(0.95);
			expect(supabaseAdmin.rpc).toHaveBeenCalledWith('search_events_ranked', {
				search_query: 'yoga',
				max_results: 20,
				current_user_id: 'user-1'
			});
		});

		it('should handle special characters in query', async () => {
			vi.mocked(supabaseAdmin.rpc).mockResolvedValue(mockSuccess([]));

			await searchEvents('yoga & meditation!', 'user-1');

			expect(supabaseAdmin.rpc).toHaveBeenCalledWith('search_events_ranked', {
				search_query: 'yoga   meditation',
				max_results: 20,
				current_user_id: 'user-1'
			});
		});

		it('should return empty array for empty query', async () => {
			const results = await searchEvents('   ', 'user-1');

			expect(results).toEqual([]);
			expect(supabaseAdmin.rpc).not.toHaveBeenCalled();
		});

		it('should work with null userId', async () => {
			const mockEvents = [
				{
					id: 'event-1',
					title: 'Public Event',
					description: 'Open to all',
					event_type: 'online',
					start_time: '2026-02-01T10:00:00Z',
					venue_name: null,
					venue_address: null,
					capacity: null,
					cover_image_url: null,
					visibility: 'public',
					creator_id: 'user-1',
					group_id: null,
					rank: 0.8
				}
			];

			vi.mocked(supabaseAdmin.rpc).mockResolvedValue(mockSuccess(mockEvents));

			const results = await searchEvents('event', null);

			expect(results).toHaveLength(1);
			expect(supabaseAdmin.rpc).toHaveBeenCalledWith('search_events_ranked', {
				search_query: 'event',
				max_results: 20,
				current_user_id: null
			});
		});

		it('should return empty array on database error', async () => {
			vi.mocked(supabaseAdmin.rpc).mockResolvedValue(mockError('DB error'));

			const results = await searchEvents('yoga', 'user-1');

			expect(results).toEqual([]);
		});

		it('should handle limit parameter', async () => {
			vi.mocked(supabaseAdmin.rpc).mockResolvedValue(mockSuccess([]));

			await searchEvents('test', 'user-1', 10);

			expect(supabaseAdmin.rpc).toHaveBeenCalledWith('search_events_ranked', {
				search_query: 'test',
				max_results: 10,
				current_user_id: 'user-1'
			});
		});

		it('should use default limit of 20', async () => {
			vi.mocked(supabaseAdmin.rpc).mockResolvedValue(mockSuccess([]));

			await searchEvents('test', 'user-1');

			expect(supabaseAdmin.rpc).toHaveBeenCalledWith('search_events_ranked', {
				search_query: 'test',
				max_results: 20,
				current_user_id: 'user-1'
			});
		});

		it('should handle null data response', async () => {
			vi.mocked(supabaseAdmin.rpc).mockResolvedValue(mockSuccess(null));

			const results = await searchEvents('test', 'user-1');

			expect(results).toEqual([]);
		});

		it('should trim whitespace from query', async () => {
			vi.mocked(supabaseAdmin.rpc).mockResolvedValue(mockSuccess([]));

			await searchEvents('  yoga class  ', 'user-1');

			expect(supabaseAdmin.rpc).toHaveBeenCalledWith('search_events_ranked', {
				search_query: 'yoga class',
				max_results: 20,
				current_user_id: 'user-1'
			});
		});

		it('should handle exception during RPC call', async () => {
			vi.mocked(supabaseAdmin.rpc).mockRejectedValue(new Error('Network error'));

			const results = await searchEvents('test', 'user-1');

			expect(results).toEqual([]);
		});
	});

	describe('searchGroups', () => {
		it('should return relevance-ranked groups matching query', async () => {
			const mockGroups = [
				{
					id: 'group-1',
					name: 'Yoga Enthusiasts',
					description: 'Community for yoga lovers',
					cover_image_url: null,
					group_type: 'public',
					location: 'Seattle, WA',
					organizer_id: 'user-1',
					rank: 0.92
				}
			];

			vi.mocked(supabaseAdmin.rpc).mockResolvedValue(mockSuccess(mockGroups));

			const results = await searchGroups('yoga', 'user-1');

			expect(results).toHaveLength(1);
			expect(results[0].name).toBe('Yoga Enthusiasts');
			expect(results[0].rank).toBe(0.92);
			expect(supabaseAdmin.rpc).toHaveBeenCalledWith('search_groups_ranked', {
				search_query: 'yoga',
				max_results: 20,
				current_user_id: 'user-1'
			});
		});

		it('should handle special characters in query', async () => {
			vi.mocked(supabaseAdmin.rpc).mockResolvedValue(mockSuccess([]));

			await searchGroups('tech & startups!', 'user-1');

			expect(supabaseAdmin.rpc).toHaveBeenCalledWith('search_groups_ranked', {
				search_query: 'tech   startups',
				max_results: 20,
				current_user_id: 'user-1'
			});
		});

		it('should return empty array for empty query', async () => {
			const results = await searchGroups('   ', 'user-1');

			expect(results).toEqual([]);
			expect(supabaseAdmin.rpc).not.toHaveBeenCalled();
		});

		it('should return empty array on database error', async () => {
			vi.mocked(supabaseAdmin.rpc).mockResolvedValue(mockError('DB error'));

			const results = await searchGroups('yoga', 'user-1');

			expect(results).toEqual([]);
		});

		it('should handle limit parameter', async () => {
			vi.mocked(supabaseAdmin.rpc).mockResolvedValue(mockSuccess([]));

			await searchGroups('test', 'user-1', 5);

			expect(supabaseAdmin.rpc).toHaveBeenCalledWith('search_groups_ranked', {
				search_query: 'test',
				max_results: 5,
				current_user_id: 'user-1'
			});
		});

		it('should use default limit of 20', async () => {
			vi.mocked(supabaseAdmin.rpc).mockResolvedValue(mockSuccess([]));

			await searchGroups('test', 'user-1');

			expect(supabaseAdmin.rpc).toHaveBeenCalledWith('search_groups_ranked', {
				search_query: 'test',
				max_results: 20,
				current_user_id: 'user-1'
			});
		});

		it('should handle null data response', async () => {
			vi.mocked(supabaseAdmin.rpc).mockResolvedValue(mockSuccess(null));

			const results = await searchGroups('test', 'user-1');

			expect(results).toEqual([]);
		});

		it('should trim whitespace from query', async () => {
			vi.mocked(supabaseAdmin.rpc).mockResolvedValue(mockSuccess([]));

			await searchGroups('  tech community  ', 'user-1');

			expect(supabaseAdmin.rpc).toHaveBeenCalledWith('search_groups_ranked', {
				search_query: 'tech community',
				max_results: 20,
				current_user_id: 'user-1'
			});
		});

		it('should handle exception during RPC call', async () => {
			vi.mocked(supabaseAdmin.rpc).mockRejectedValue(new Error('Network error'));

			const results = await searchGroups('test', 'user-1');

			expect(results).toEqual([]);
		});

		it('should work with null userId', async () => {
			vi.mocked(supabaseAdmin.rpc).mockResolvedValue(mockSuccess([]));

			await searchGroups('test', null);

			expect(supabaseAdmin.rpc).toHaveBeenCalledWith('search_groups_ranked', {
				search_query: 'test',
				max_results: 20,
				current_user_id: null
			});
		});
	});

	describe('searchEventsWithFilters', () => {
		it('should filter by event type', async () => {
			const mockEvents = [
				{
					id: 'event-1',
					title: 'Online Yoga',
					description: 'Zoom yoga session',
					event_type: 'online',
					start_time: '2026-02-01T10:00:00Z',
					venue_name: null,
					venue_address: null,
					capacity: 50,
					cover_image_url: null,
					visibility: 'public',
					creator_id: 'user-1',
					group_id: null,
					event_size: 'medium',
					rank: 0.9
				}
			];

			vi.mocked(supabaseAdmin.rpc).mockResolvedValue(mockSuccess(mockEvents));

			const { searchEventsWithFilters } = await import('./search');
			const results = await searchEventsWithFilters('yoga', 'user-1', {
				eventType: 'online'
			});

			expect(results).toHaveLength(1);
			expect(results[0].event_type).toBe('online');
			expect(supabaseAdmin.rpc).toHaveBeenCalledWith('search_events_ranked', {
				search_query: 'yoga',
				max_results: 20,
				current_user_id: 'user-1',
				filter_event_type: 'online',
				filter_start_date: null,
				filter_end_date: null,
				filter_event_size: null
			});
		});

		it('should filter by date range', async () => {
			vi.mocked(supabaseAdmin.rpc).mockResolvedValue(mockSuccess([]));

			const { searchEventsWithFilters } = await import('./search');
			await searchEventsWithFilters('event', 'user-1', {
				startDate: '2026-02-01T00:00:00Z',
				endDate: '2026-02-28T23:59:59Z'
			});

			expect(supabaseAdmin.rpc).toHaveBeenCalledWith('search_events_ranked', {
				search_query: 'event',
				max_results: 20,
				current_user_id: 'user-1',
				filter_event_type: null,
				filter_start_date: '2026-02-01T00:00:00Z',
				filter_end_date: '2026-02-28T23:59:59Z',
				filter_event_size: null
			});
		});

		it('should filter by event size', async () => {
			vi.mocked(supabaseAdmin.rpc).mockResolvedValue(mockSuccess([]));

			const { searchEventsWithFilters } = await import('./search');
			await searchEventsWithFilters('event', 'user-1', {
				eventSize: 'intimate'
			});

			expect(supabaseAdmin.rpc).toHaveBeenCalledWith('search_events_ranked', {
				search_query: 'event',
				max_results: 20,
				current_user_id: 'user-1',
				filter_event_type: null,
				filter_start_date: null,
				filter_end_date: null,
				filter_event_size: 'intimate'
			});
		});

		it('should apply multiple filters simultaneously', async () => {
			const mockEvents = [
				{
					id: 'event-1',
					title: 'Small In-Person Meetup',
					description: 'Coffee chat',
					event_type: 'in_person',
					start_time: '2026-02-15T14:00:00Z',
					venue_name: 'Coffee Shop',
					venue_address: '123 Main St',
					capacity: 8,
					cover_image_url: null,
					visibility: 'public',
					creator_id: 'user-1',
					group_id: null,
					event_size: 'intimate',
					rank: 0.85
				}
			];

			vi.mocked(supabaseAdmin.rpc).mockResolvedValue(mockSuccess(mockEvents));

			const { searchEventsWithFilters } = await import('./search');
			const results = await searchEventsWithFilters('meetup', 'user-1', {
				eventType: 'in_person',
				startDate: '2026-02-01T00:00:00Z',
				endDate: '2026-02-28T23:59:59Z',
				eventSize: 'intimate'
			});

			expect(results).toHaveLength(1);
			expect(results[0].event_type).toBe('in_person');
			expect(results[0].event_size).toBe('intimate');
			expect(supabaseAdmin.rpc).toHaveBeenCalledWith('search_events_ranked', {
				search_query: 'meetup',
				max_results: 20,
				current_user_id: 'user-1',
				filter_event_type: 'in_person',
				filter_start_date: '2026-02-01T00:00:00Z',
				filter_end_date: '2026-02-28T23:59:59Z',
				filter_event_size: 'intimate'
			});
		});

		it('should work with no filters (same as searchEvents)', async () => {
			vi.mocked(supabaseAdmin.rpc).mockResolvedValue(mockSuccess([]));

			const { searchEventsWithFilters } = await import('./search');
			await searchEventsWithFilters('event', 'user-1', {});

			expect(supabaseAdmin.rpc).toHaveBeenCalledWith('search_events_ranked', {
				search_query: 'event',
				max_results: 20,
				current_user_id: 'user-1',
				filter_event_type: null,
				filter_start_date: null,
				filter_end_date: null,
				filter_event_size: null
			});
		});

		it('should return empty array on database error', async () => {
			vi.mocked(supabaseAdmin.rpc).mockResolvedValue(mockError('DB error'));

			const { searchEventsWithFilters } = await import('./search');
			const results = await searchEventsWithFilters('event', 'user-1', {
				eventType: 'online'
			});

			expect(results).toEqual([]);
		});

		it('should handle custom limit with filters', async () => {
			vi.mocked(supabaseAdmin.rpc).mockResolvedValue(mockSuccess([]));

			const { searchEventsWithFilters } = await import('./search');
			await searchEventsWithFilters('event', 'user-1', { eventType: 'hybrid' }, 10);

			expect(supabaseAdmin.rpc).toHaveBeenCalledWith('search_events_ranked', {
				search_query: 'event',
				max_results: 10,
				current_user_id: 'user-1',
				filter_event_type: 'hybrid',
				filter_start_date: null,
				filter_end_date: null,
				filter_event_size: null
			});
		});
	});

	describe('search', () => {
		it('should return combined results from events and groups', async () => {
			const mockEvents = [
				{
					id: 'event-1',
					title: 'Yoga Class',
					description: 'Morning yoga',
					event_type: 'in_person',
					start_time: '2026-02-01T10:00:00Z',
					venue_name: 'Park',
					venue_address: '123 St',
					capacity: 20,
					cover_image_url: null,
					visibility: 'public',
					creator_id: 'user-1',
					group_id: null,
					rank: 0.9
				}
			];

			const mockGroups = [
				{
					id: 'group-1',
					name: 'Yoga Group',
					description: 'Yoga community',
					cover_image_url: null,
					group_type: 'public',
					location: 'Seattle',
					organizer_id: 'user-1',
					rank: 0.85
				}
			];

			vi.mocked(supabaseAdmin.rpc)
				.mockResolvedValueOnce(mockSuccess(mockEvents))
				.mockResolvedValueOnce(mockSuccess(mockGroups));

			const results = await search('yoga', 'user-1');

			expect(results.events).toHaveLength(1);
			expect(results.groups).toHaveLength(1);
			expect(results.eventsCount).toBe(1);
			expect(results.groupsCount).toBe(1);
		});

		it('should work with null userId', async () => {
			vi.mocked(supabaseAdmin.rpc).mockResolvedValue(mockSuccess([]));

			const results = await search('test', null);

			expect(results.events).toEqual([]);
			expect(results.groups).toEqual([]);
			expect(results.eventsCount).toBe(0);
			expect(results.groupsCount).toBe(0);
		});

		it('should handle empty results', async () => {
			vi.mocked(supabaseAdmin.rpc).mockResolvedValue(mockSuccess([]));

			const results = await search('nonexistent', 'user-1');

			expect(results.events).toEqual([]);
			expect(results.groups).toEqual([]);
			expect(results.eventsCount).toBe(0);
			expect(results.groupsCount).toBe(0);
		});

		it('should handle errors gracefully', async () => {
			vi.mocked(supabaseAdmin.rpc)
				.mockResolvedValueOnce(mockError('DB error'))
				.mockResolvedValueOnce(mockSuccess([]));

			const results = await search('test', 'user-1');

			expect(results.events).toEqual([]);
			expect(results.groups).toEqual([]);
		});

		it('should handle partial failures', async () => {
			const mockGroups = [
				{
					id: 'group-1',
					name: 'Tech Group',
					description: 'Tech community',
					cover_image_url: null,
					group_type: 'public',
					location: 'Seattle',
					organizer_id: 'user-1',
					rank: 0.75
				}
			];

			vi.mocked(supabaseAdmin.rpc)
				.mockResolvedValueOnce(mockError('DB error'))
				.mockResolvedValueOnce(mockSuccess(mockGroups));

			const results = await search('tech', 'user-1');

			expect(results.events).toEqual([]);
			expect(results.groups).toHaveLength(1);
			expect(results.eventsCount).toBe(0);
			expect(results.groupsCount).toBe(1);
		});
	});
});
