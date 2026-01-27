import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { fetchHappeningTodayEvents } from './happening-today';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('fetchHappeningTodayEvents', () => {
	let mockSupabase: SupabaseClient;
	let mockQuery: {
		select: ReturnType<typeof vi.fn>;
		gte: ReturnType<typeof vi.fn>;
		lte: ReturnType<typeof vi.fn>;
		eq: ReturnType<typeof vi.fn>;
		order: ReturnType<typeof vi.fn>;
		limit: ReturnType<typeof vi.fn>;
		data?: unknown;
		error?: unknown;
	};

	beforeEach(() => {
		// Mock current time to 2026-01-27 12:00:00 UTC
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-01-27T12:00:00Z'));

		// Create mock query builder
		mockQuery = {
			select: vi.fn().mockReturnThis(),
			gte: vi.fn().mockReturnThis(),
			lte: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			order: vi.fn().mockReturnThis(),
			limit: vi.fn().mockReturnThis()
		};

		// Create mock Supabase client
		mockSupabase = {
			from: vi.fn().mockReturnValue(mockQuery)
		} as unknown as SupabaseClient;
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('should fetch events happening today', async () => {
		const mockEvents = [
			{
				id: '1',
				title: 'Test Event 1',
				description: 'Description 1',
				start_time: '2026-01-27T14:00:00Z',
				end_time: '2026-01-27T16:00:00Z',
				event_type: 'in_person',
				venue_name: 'Test Venue',
				venue_address: '123 Test St',
				capacity: 50,
				cover_image_url: null,
				visibility: 'public',
				creator_id: 'user1',
				group_id: null,
				event_size: 'medium'
			}
		];

		// Mock successful query
		mockQuery.data = mockEvents;
		mockQuery.error = null;

		const result = await fetchHappeningTodayEvents(mockSupabase);

		// Verify query builder was called correctly
		expect(mockSupabase.from).toHaveBeenCalledWith('events');
		expect(mockQuery.select).toHaveBeenCalledWith(
			'id, title, description, start_time, end_time, event_type, venue_name, venue_address, capacity, cover_image_url, visibility, creator_id, group_id, event_size'
		);

		// Verify filters
		expect(mockQuery.gte).toHaveBeenCalledWith('start_time', '2026-01-27T12:00:00.000Z'); // Now
		expect(mockQuery.lte).toHaveBeenCalledWith('start_time', '2026-01-27T23:59:59.999Z'); // End of day
		expect(mockQuery.eq).toHaveBeenCalledWith('visibility', 'public');
		expect(mockQuery.order).toHaveBeenCalledWith('start_time', { ascending: true });

		// Verify result
		expect(result).toEqual(mockEvents);
	});

	it('should apply limit when provided', async () => {
		mockQuery.data = [];
		mockQuery.error = null;

		await fetchHappeningTodayEvents(mockSupabase, 10);

		expect(mockQuery.limit).toHaveBeenCalledWith(10);
	});

	it('should not apply limit when not provided', async () => {
		mockQuery.data = [];
		mockQuery.error = null;

		await fetchHappeningTodayEvents(mockSupabase);

		expect(mockQuery.limit).not.toHaveBeenCalled();
	});

	it('should return empty array when no events found', async () => {
		mockQuery.data = [];
		mockQuery.error = null;

		const result = await fetchHappeningTodayEvents(mockSupabase);
		expect(result).toEqual([]);
	});

	it('should return empty array when data is null', async () => {
		mockQuery.data = null;
		mockQuery.error = null;

		const result = await fetchHappeningTodayEvents(mockSupabase);
		expect(result).toEqual([]);
	});

	it('should throw error when query fails', async () => {
		mockQuery.data = null;
		mockQuery.error = { message: 'Database error' };

		await expect(fetchHappeningTodayEvents(mockSupabase)).rejects.toThrow('Database error');
	});

	it('should only include events with start_time >= now', async () => {
		// Set time to 2026-01-27 15:00:00 UTC
		vi.setSystemTime(new Date('2026-01-27T15:00:00Z'));

		mockQuery.data = [];
		mockQuery.error = null;

		await fetchHappeningTodayEvents(mockSupabase);

		// Should query for events starting at or after 15:00:00
		expect(mockQuery.gte).toHaveBeenCalledWith('start_time', '2026-01-27T15:00:00.000Z');
	});

	it('should only include events with start_time <= end of today', async () => {
		mockQuery.data = [];
		mockQuery.error = null;

		await fetchHappeningTodayEvents(mockSupabase);

		// Should query for events starting before end of day
		expect(mockQuery.lte).toHaveBeenCalledWith('start_time', '2026-01-27T23:59:59.999Z');
	});

	it('should only include public events', async () => {
		mockQuery.data = [];
		mockQuery.error = null;

		await fetchHappeningTodayEvents(mockSupabase);

		expect(mockQuery.eq).toHaveBeenCalledWith('visibility', 'public');
	});

	it('should order events by start_time ascending', async () => {
		mockQuery.data = [];
		mockQuery.error = null;

		await fetchHappeningTodayEvents(mockSupabase);

		expect(mockQuery.order).toHaveBeenCalledWith('start_time', { ascending: true });
	});
});
