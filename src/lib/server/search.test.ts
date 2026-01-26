// Tests for search functionality
// Validates search logic for events and groups

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchEvents, searchGroups, search } from './search';
import { supabaseAdmin } from './supabase';

// Mock supabaseAdmin
vi.mock('./supabase', () => ({
	supabaseAdmin: {
		from: vi.fn()
	}
}));

describe('Search Functionality', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('searchEvents', () => {
		it('should return public events matching query', async () => {
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
					group_id: null
				}
			];

			const mockQuery = {
				select: vi.fn().mockReturnThis(),
				gte: vi.fn().mockReturnThis(),
				order: vi.fn().mockReturnThis(),
				limit: vi.fn().mockReturnThis(),
				textSearch: vi.fn().mockResolvedValue({ data: mockEvents, error: null })
			};

			vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as never);

			const results = await searchEvents('yoga', 'user-1');

			expect(results).toHaveLength(1);
			expect(results[0].title).toBe('Yoga in the Park');
			expect(supabaseAdmin.from).toHaveBeenCalledWith('events');
		});

		it('should filter out non-public events for unauthenticated users', async () => {
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
					group_id: null
				},
				{
					id: 'event-2',
					title: 'Private Event',
					description: 'Members only',
					event_type: 'online',
					start_time: '2026-02-01T10:00:00Z',
					venue_name: null,
					venue_address: null,
					capacity: null,
					cover_image_url: null,
					visibility: 'group_only',
					creator_id: 'user-2',
					group_id: 'group-1'
				}
			];

			const mockQuery = {
				select: vi.fn().mockReturnThis(),
				gte: vi.fn().mockReturnThis(),
				order: vi.fn().mockReturnThis(),
				limit: vi.fn().mockReturnThis(),
				textSearch: vi.fn().mockResolvedValue({ data: mockEvents, error: null })
			};

			vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as never);

			const results = await searchEvents('event', null);

			expect(results).toHaveLength(1);
			expect(results[0].title).toBe('Public Event');
		});

		it('should include creator own events regardless of visibility', async () => {
			const mockEvents = [
				{
					id: 'event-1',
					title: 'My Hidden Event',
					description: 'Private event',
					event_type: 'online',
					start_time: '2026-02-01T10:00:00Z',
					venue_name: null,
					venue_address: null,
					capacity: null,
					cover_image_url: null,
					visibility: 'hidden',
					creator_id: 'user-1',
					group_id: null
				}
			];

			const mockQuery = {
				select: vi.fn().mockReturnThis(),
				gte: vi.fn().mockReturnThis(),
				order: vi.fn().mockReturnThis(),
				limit: vi.fn().mockReturnThis(),
				textSearch: vi.fn().mockResolvedValue({ data: mockEvents, error: null })
			};

			vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as never);

			const results = await searchEvents('event', 'user-1');

			expect(results).toHaveLength(1);
			expect(results[0].title).toBe('My Hidden Event');
		});

		it('should return empty array on database error', async () => {
			const mockQuery = {
				select: vi.fn().mockReturnThis(),
				gte: vi.fn().mockReturnThis(),
				order: vi.fn().mockReturnThis(),
				limit: vi.fn().mockReturnThis(),
				textSearch: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } })
			};

			vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as never);

			const results = await searchEvents('yoga', 'user-1');

			expect(results).toEqual([]);
		});

		it('should limit results to specified number', async () => {
			const mockQuery = {
				select: vi.fn().mockReturnThis(),
				gte: vi.fn().mockReturnThis(),
				order: vi.fn().mockReturnThis(),
				limit: vi.fn().mockReturnThis(),
				textSearch: vi.fn().mockResolvedValue({ data: [], error: null })
			};

			vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as never);

			await searchEvents('test', 'user-1', 10);

			expect(mockQuery.limit).toHaveBeenCalledWith(10);
		});

		it('should use default limit of 20', async () => {
			const mockQuery = {
				select: vi.fn().mockReturnThis(),
				gte: vi.fn().mockReturnThis(),
				order: vi.fn().mockReturnThis(),
				limit: vi.fn().mockReturnThis(),
				textSearch: vi.fn().mockResolvedValue({ data: [], error: null })
			};

			vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as never);

			await searchEvents('test', 'user-1');

			expect(mockQuery.limit).toHaveBeenCalledWith(20);
		});
	});

	describe('searchGroups', () => {
		it('should return public groups matching query', async () => {
			const mockGroups = [
				{
					id: 'group-1',
					name: 'Yoga Enthusiasts',
					description: 'Community for yoga lovers',
					cover_image_url: null,
					group_type: 'public',
					location: 'Seattle, WA',
					organizer_id: 'user-1'
				}
			];

			const mockQuery = {
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				order: vi.fn().mockReturnThis(),
				limit: vi.fn().mockReturnThis(),
				textSearch: vi.fn().mockResolvedValue({ data: mockGroups, error: null })
			};

			vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as never);

			const results = await searchGroups('yoga', 'user-1');

			expect(results).toHaveLength(1);
			expect(results[0].name).toBe('Yoga Enthusiasts');
			expect(supabaseAdmin.from).toHaveBeenCalledWith('groups');
		});

		it('should only search public groups', async () => {
			const mockQuery = {
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				order: vi.fn().mockReturnThis(),
				limit: vi.fn().mockReturnThis(),
				textSearch: vi.fn().mockResolvedValue({ data: [], error: null })
			};

			vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as never);

			await searchGroups('test', 'user-1');

			expect(mockQuery.eq).toHaveBeenCalledWith('group_type', 'public');
		});

		it('should return empty array on database error', async () => {
			const mockQuery = {
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				order: vi.fn().mockReturnThis(),
				limit: vi.fn().mockReturnThis(),
				textSearch: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } })
			};

			vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as never);

			const results = await searchGroups('yoga', 'user-1');

			expect(results).toEqual([]);
		});

		it('should limit results to specified number', async () => {
			const mockQuery = {
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				order: vi.fn().mockReturnThis(),
				limit: vi.fn().mockReturnThis(),
				textSearch: vi.fn().mockResolvedValue({ data: [], error: null })
			};

			vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as never);

			await searchGroups('test', 'user-1', 5);

			expect(mockQuery.limit).toHaveBeenCalledWith(5);
		});

		it('should use default limit of 20', async () => {
			const mockQuery = {
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				order: vi.fn().mockReturnThis(),
				limit: vi.fn().mockReturnThis(),
				textSearch: vi.fn().mockResolvedValue({ data: [], error: null })
			};

			vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as never);

			await searchGroups('test', 'user-1');

			expect(mockQuery.limit).toHaveBeenCalledWith(20);
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
					group_id: null
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
					organizer_id: 'user-1'
				}
			];

			const mockQuery = {
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				gte: vi.fn().mockReturnThis(),
				order: vi.fn().mockReturnThis(),
				limit: vi.fn().mockReturnThis(),
				textSearch: vi
					.fn()
					.mockResolvedValueOnce({ data: mockEvents, error: null })
					.mockResolvedValueOnce({ data: mockGroups, error: null })
			};

			vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as never);

			const results = await search('yoga', 'user-1');

			expect(results.events).toHaveLength(1);
			expect(results.groups).toHaveLength(1);
			expect(results.eventsCount).toBe(1);
			expect(results.groupsCount).toBe(1);
		});

		it('should work with null userId', async () => {
			const mockQuery = {
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				gte: vi.fn().mockReturnThis(),
				order: vi.fn().mockReturnThis(),
				limit: vi.fn().mockReturnThis(),
				textSearch: vi.fn().mockResolvedValue({ data: [], error: null })
			};

			vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as never);

			const results = await search('test', null);

			expect(results.events).toEqual([]);
			expect(results.groups).toEqual([]);
			expect(results.eventsCount).toBe(0);
			expect(results.groupsCount).toBe(0);
		});

		it('should handle empty results', async () => {
			const mockQuery = {
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				gte: vi.fn().mockReturnThis(),
				order: vi.fn().mockReturnThis(),
				limit: vi.fn().mockReturnThis(),
				textSearch: vi.fn().mockResolvedValue({ data: [], error: null })
			};

			vi.mocked(supabaseAdmin.from).mockReturnValue(mockQuery as never);

			const results = await search('nonexistent', 'user-1');

			expect(results.events).toEqual([]);
			expect(results.groups).toEqual([]);
			expect(results.eventsCount).toBe(0);
			expect(results.groupsCount).toBe(0);
		});
	});
});
