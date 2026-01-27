import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchNearbyEvents, fetchUserLocation } from './nearby-events';
import type { Coordinates } from '$lib/utils/location';

describe('Nearby Events Server Functions', () => {
	let mockSupabase: any;

	beforeEach(() => {
		mockSupabase = {
			from: vi.fn(),
			select: vi.fn(),
			in: vi.fn(),
			not: vi.fn(),
			gte: vi.fn(),
			lte: vi.fn(),
			eq: vi.fn(),
			order: vi.fn(),
			limit: vi.fn(),
			single: vi.fn()
		};

		// Make all methods chainable
		mockSupabase.from.mockReturnValue(mockSupabase);
		mockSupabase.select.mockReturnValue(mockSupabase);
		mockSupabase.in.mockReturnValue(mockSupabase);
		mockSupabase.not.mockReturnValue(mockSupabase);
		mockSupabase.gte.mockReturnValue(mockSupabase);
		mockSupabase.lte.mockReturnValue(mockSupabase);
		mockSupabase.eq.mockReturnValue(mockSupabase);
		mockSupabase.order.mockReturnValue(mockSupabase);
		mockSupabase.limit.mockReturnValue(mockSupabase);
		mockSupabase.single.mockReturnValue(mockSupabase);
	});

	describe('fetchNearbyEvents', () => {
		it('should fetch events within radius', async () => {
			const userCoords: Coordinates = { lat: 37.7749, lng: -122.4194 }; // San Francisco

			const mockEvents = [
				{
					id: 'event-1',
					title: 'Event 1',
					description: 'Description 1',
					start_time: '2026-02-01T10:00:00Z',
					end_time: '2026-02-01T12:00:00Z',
					event_type: 'in_person',
					venue_name: 'Venue 1',
					venue_address: '123 Main St',
					venue_lat: 37.7849, // ~0.7 miles away
					venue_lng: -122.4094,
					visibility: 'public',
					group_id: null,
					capacity: 50
				},
				{
					id: 'event-2',
					title: 'Event 2',
					description: 'Description 2',
					start_time: '2026-02-02T14:00:00Z',
					end_time: '2026-02-02T16:00:00Z',
					event_type: 'hybrid',
					venue_name: 'Venue 2',
					venue_address: '456 Oak Ave',
					venue_lat: 37.7949, // ~1.4 miles away
					venue_lng: -122.4294,
					visibility: 'public',
					group_id: 'group-1',
					capacity: 30
				}
			];

			const mockRsvps = [
				{ event_id: 'event-1', status: 'going' },
				{ event_id: 'event-1', status: 'going' },
				{ event_id: 'event-1', status: 'interested' },
				{ event_id: 'event-2', status: 'going' }
			];

			// Setup mock for first events query
			mockSupabase.limit.mockResolvedValueOnce({ data: mockEvents, error: null });

			// Setup mock for RSVP counts query
			mockSupabase.in.mockResolvedValueOnce({ data: mockRsvps, error: null });

			const results = await fetchNearbyEvents(mockSupabase, userCoords, 25, 20);

			expect(results).toHaveLength(2);
			expect(results[0].title).toBe('Event 1');
			expect(results[0].distance_miles).toBeGreaterThan(0);
			expect(results[0].distance_miles).toBeLessThan(2);
			expect(results[0].going_count).toBe(2);
			expect(results[0].interested_count).toBe(1);

			expect(results[1].title).toBe('Event 2');
			expect(results[1].going_count).toBe(1);
			expect(results[1].interested_count).toBe(0);

			// Results should be sorted by distance
			expect(results[0].distance_miles).toBeLessThan(results[1].distance_miles);
		});

		it('should filter events outside radius', async () => {
			const userCoords: Coordinates = { lat: 37.7749, lng: -122.4194 };

			const mockEvents = [
				{
					id: 'event-near',
					title: 'Near Event',
					description: 'Close by',
					start_time: '2026-02-01T10:00:00Z',
					end_time: '2026-02-01T12:00:00Z',
					event_type: 'in_person',
					venue_name: 'Close Venue',
					venue_address: '123 Main St',
					venue_lat: 37.7849, // ~0.7 miles
					venue_lng: -122.4094,
					visibility: 'public',
					group_id: null,
					capacity: 50
				},
				{
					id: 'event-far',
					title: 'Far Event',
					description: 'Far away',
					start_time: '2026-02-01T10:00:00Z',
					end_time: '2026-02-01T12:00:00Z',
					event_type: 'in_person',
					venue_name: 'Far Venue',
					venue_address: '999 Far St',
					venue_lat: 38.5, // ~50+ miles
					venue_lng: -122.0,
					visibility: 'public',
					group_id: null,
					capacity: 50
				}
			];

			mockSupabase.limit.mockResolvedValueOnce({ data: mockEvents, error: null });
			mockSupabase.in.mockResolvedValueOnce({ data: [], error: null });

			const results = await fetchNearbyEvents(mockSupabase, userCoords, 5, 20);

			// Only near event should be returned
			expect(results).toHaveLength(1);
			expect(results[0].title).toBe('Near Event');
		});

		it('should return empty array when no events found', async () => {
			const userCoords: Coordinates = { lat: 37.7749, lng: -122.4194 };

			mockSupabase.limit.mockResolvedValueOnce({ data: [], error: null });

			const results = await fetchNearbyEvents(mockSupabase, userCoords);

			expect(results).toEqual([]);
		});

		it('should handle database errors', async () => {
			const userCoords: Coordinates = { lat: 37.7749, lng: -122.4194 };

			mockSupabase.limit.mockResolvedValueOnce({
				data: null,
				error: { message: 'Database error' }
			});

			await expect(fetchNearbyEvents(mockSupabase, userCoords)).rejects.toThrow(
				'Failed to fetch nearby events'
			);
		});

		it('should respect limit parameter', async () => {
			const userCoords: Coordinates = { lat: 37.7749, lng: -122.4194 };

			const mockEvents = Array.from({ length: 10 }, (_, i) => ({
				id: `event-${i}`,
				title: `Event ${i}`,
				description: `Description ${i}`,
				start_time: '2026-02-01T10:00:00Z',
				end_time: '2026-02-01T12:00:00Z',
				event_type: 'in_person',
				venue_name: `Venue ${i}`,
				venue_address: `${i} Main St`,
				venue_lat: 37.7749 + i * 0.01,
				venue_lng: -122.4194 + i * 0.01,
				visibility: 'public',
				group_id: null,
				capacity: 50
			}));

			mockSupabase.limit.mockResolvedValueOnce({ data: mockEvents, error: null });
			mockSupabase.in.mockResolvedValueOnce({ data: [], error: null });

			const results = await fetchNearbyEvents(mockSupabase, userCoords, 25, 5);

			expect(results).toHaveLength(5);
		});

		it('should handle events without RSVP counts', async () => {
			const userCoords: Coordinates = { lat: 37.7749, lng: -122.4194 };

			const mockEvents = [
				{
					id: 'event-1',
					title: 'Event 1',
					description: 'Description 1',
					start_time: '2026-02-01T10:00:00Z',
					end_time: '2026-02-01T12:00:00Z',
					event_type: 'in_person',
					venue_name: 'Venue 1',
					venue_address: '123 Main St',
					venue_lat: 37.7849,
					venue_lng: -122.4094,
					visibility: 'public',
					group_id: null,
					capacity: 50
				}
			];

			mockSupabase.limit.mockResolvedValueOnce({ data: mockEvents, error: null });
			mockSupabase.in.mockResolvedValueOnce({ data: null, error: null });

			const results = await fetchNearbyEvents(mockSupabase, userCoords);

			expect(results).toHaveLength(1);
			expect(results[0].going_count).toBe(0);
			expect(results[0].interested_count).toBe(0);
		});

		it('should use default radius and limit', async () => {
			const userCoords: Coordinates = { lat: 37.7749, lng: -122.4194 };

			mockSupabase.limit.mockResolvedValueOnce({ data: [], error: null });

			await fetchNearbyEvents(mockSupabase, userCoords);

			// Verify limit was called with default * 2
			expect(mockSupabase.limit).toHaveBeenCalledWith(40); // default 20 * 2
		});
	});

	describe('fetchUserLocation', () => {
		it('should return user coordinates when available', async () => {
			const mockUser = {
				location_lat: 37.7749,
				location_lng: -122.4194
			};

			mockSupabase.single.mockResolvedValueOnce({ data: mockUser, error: null });

			const result = await fetchUserLocation(mockSupabase, 'user-123');

			expect(result).toEqual({ lat: 37.7749, lng: -122.4194 });
		});

		it('should return null when user has no location', async () => {
			const mockUser = {
				location_lat: null,
				location_lng: null
			};

			mockSupabase.single.mockResolvedValueOnce({ data: mockUser, error: null });

			const result = await fetchUserLocation(mockSupabase, 'user-123');

			expect(result).toBeNull();
		});

		it('should return null when database error occurs', async () => {
			mockSupabase.single.mockResolvedValueOnce({
				data: null,
				error: { message: 'User not found' }
			});

			const result = await fetchUserLocation(mockSupabase, 'user-123');

			expect(result).toBeNull();
		});

		it('should return null when lat is null but lng is not', async () => {
			const mockUser = {
				location_lat: null,
				location_lng: -122.4194
			};

			mockSupabase.single.mockResolvedValueOnce({ data: mockUser, error: null });

			const result = await fetchUserLocation(mockSupabase, 'user-123');

			expect(result).toBeNull();
		});

		it('should return null when lng is null but lat is not', async () => {
			const mockUser = {
				location_lat: 37.7749,
				location_lng: null
			};

			mockSupabase.single.mockResolvedValueOnce({ data: mockUser, error: null });

			const result = await fetchUserLocation(mockSupabase, 'user-123');

			expect(result).toBeNull();
		});
	});
});
