import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchNearbyEvents, fetchUserLocation } from './nearby-events';
import type { Coordinates } from '$lib/utils/location';

describe('Nearby Events Server Functions', () => {
	let mockSupabase: any;

	beforeEach(() => {
		mockSupabase = {
			from: vi.fn(),
			auth: {
				getSession: vi.fn()
			}
		};
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
					capacity: 50,
					cover_image_url: null,
					creator_id: 'user-1',
					event_size: 'medium'
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
					capacity: 30,
					cover_image_url: null,
					creator_id: 'user-2',
					event_size: 'small'
				}
			];

			const mockRsvps = [
				{ event_id: 'event-1', status: 'going' },
				{ event_id: 'event-1', status: 'going' },
				{ event_id: 'event-1', status: 'interested' },
				{ event_id: 'event-2', status: 'going' }
			];

			// Mock first query chain (events)
			mockSupabase.from.mockReturnValueOnce({
				select: vi.fn().mockReturnValue({
					in: vi.fn().mockReturnValue({
						not: vi.fn().mockReturnValue({
							not: vi.fn().mockReturnValue({
								gte: vi.fn().mockReturnValue({
									lte: vi.fn().mockReturnValue({
										gte: vi.fn().mockReturnValue({
											lte: vi.fn().mockReturnValue({
												gte: vi.fn().mockReturnValue({
													eq: vi.fn().mockReturnValue({
														order: vi.fn().mockReturnValue({
															limit: vi.fn().mockResolvedValue({ data: mockEvents, error: null })
														})
													})
												})
											})
										})
									})
								})
							})
						})
					})
				})
			});

			// Mock second query chain (RSVPs)
			mockSupabase.from.mockReturnValueOnce({
				select: vi.fn().mockReturnValue({
					in: vi.fn().mockResolvedValue({ data: mockRsvps, error: null })
				})
			});

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
					capacity: 50,
					cover_image_url: null,
					creator_id: 'user-1',
					event_size: 'medium'
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
					capacity: 50,
					cover_image_url: null,
					creator_id: 'user-1',
					event_size: 'medium'
				}
			];

			// Mock first query chain (events)
			mockSupabase.from.mockReturnValueOnce({
				select: vi.fn().mockReturnValue({
					in: vi.fn().mockReturnValue({
						not: vi.fn().mockReturnValue({
							not: vi.fn().mockReturnValue({
								gte: vi.fn().mockReturnValue({
									lte: vi.fn().mockReturnValue({
										gte: vi.fn().mockReturnValue({
											lte: vi.fn().mockReturnValue({
												gte: vi.fn().mockReturnValue({
													eq: vi.fn().mockReturnValue({
														order: vi.fn().mockReturnValue({
															limit: vi.fn().mockResolvedValue({ data: mockEvents, error: null })
														})
													})
												})
											})
										})
									})
								})
							})
						})
					})
				})
			});

			// Mock second query chain (RSVPs)
			mockSupabase.from.mockReturnValueOnce({
				select: vi.fn().mockReturnValue({
					in: vi.fn().mockResolvedValue({ data: [], error: null })
				})
			});

			const results = await fetchNearbyEvents(mockSupabase, userCoords, 5, 20);

			// Only near event should be returned
			expect(results).toHaveLength(1);
			expect(results[0].title).toBe('Near Event');
		});

		it('should return empty array when no events found', async () => {
			const userCoords: Coordinates = { lat: 37.7749, lng: -122.4194 };

			// Mock first query chain (events) - returns empty array
			mockSupabase.from.mockReturnValueOnce({
				select: vi.fn().mockReturnValue({
					in: vi.fn().mockReturnValue({
						not: vi.fn().mockReturnValue({
							not: vi.fn().mockReturnValue({
								gte: vi.fn().mockReturnValue({
									lte: vi.fn().mockReturnValue({
										gte: vi.fn().mockReturnValue({
											lte: vi.fn().mockReturnValue({
												gte: vi.fn().mockReturnValue({
													eq: vi.fn().mockReturnValue({
														order: vi.fn().mockReturnValue({
															limit: vi.fn().mockResolvedValue({ data: [], error: null })
														})
													})
												})
											})
										})
									})
								})
							})
						})
					})
				})
			});

			const results = await fetchNearbyEvents(mockSupabase, userCoords);

			expect(results).toEqual([]);
		});

		it('should handle database errors', async () => {
			const userCoords: Coordinates = { lat: 37.7749, lng: -122.4194 };

			// Mock first query chain (events) - returns error
			mockSupabase.from.mockReturnValueOnce({
				select: vi.fn().mockReturnValue({
					in: vi.fn().mockReturnValue({
						not: vi.fn().mockReturnValue({
							not: vi.fn().mockReturnValue({
								gte: vi.fn().mockReturnValue({
									lte: vi.fn().mockReturnValue({
										gte: vi.fn().mockReturnValue({
											lte: vi.fn().mockReturnValue({
												gte: vi.fn().mockReturnValue({
													eq: vi.fn().mockReturnValue({
														order: vi.fn().mockReturnValue({
															limit: vi.fn().mockResolvedValue({
																data: null,
																error: { message: 'Database error' }
															})
														})
													})
												})
											})
										})
									})
								})
							})
						})
					})
				})
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
				event_type: 'in_person' as const,
				venue_name: `Venue ${i}`,
				venue_address: `${i} Main St`,
				venue_lat: 37.7749 + i * 0.01,
				venue_lng: -122.4194 + i * 0.01,
				visibility: 'public' as const,
				group_id: null,
				capacity: 50,
				cover_image_url: null,
				creator_id: 'user-1',
				event_size: 'medium' as const
			}));

			// Mock first query chain (events)
			mockSupabase.from.mockReturnValueOnce({
				select: vi.fn().mockReturnValue({
					in: vi.fn().mockReturnValue({
						not: vi.fn().mockReturnValue({
							not: vi.fn().mockReturnValue({
								gte: vi.fn().mockReturnValue({
									lte: vi.fn().mockReturnValue({
										gte: vi.fn().mockReturnValue({
											lte: vi.fn().mockReturnValue({
												gte: vi.fn().mockReturnValue({
													eq: vi.fn().mockReturnValue({
														order: vi.fn().mockReturnValue({
															limit: vi.fn().mockResolvedValue({ data: mockEvents, error: null })
														})
													})
												})
											})
										})
									})
								})
							})
						})
					})
				})
			});

			// Mock second query chain (RSVPs)
			mockSupabase.from.mockReturnValueOnce({
				select: vi.fn().mockReturnValue({
					in: vi.fn().mockResolvedValue({ data: [], error: null })
				})
			});

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
					capacity: 50,
					cover_image_url: null,
					creator_id: 'user-1',
					event_size: 'medium'
				}
			];

			// Mock first query chain (events)
			mockSupabase.from.mockReturnValueOnce({
				select: vi.fn().mockReturnValue({
					in: vi.fn().mockReturnValue({
						not: vi.fn().mockReturnValue({
							not: vi.fn().mockReturnValue({
								gte: vi.fn().mockReturnValue({
									lte: vi.fn().mockReturnValue({
										gte: vi.fn().mockReturnValue({
											lte: vi.fn().mockReturnValue({
												gte: vi.fn().mockReturnValue({
													eq: vi.fn().mockReturnValue({
														order: vi.fn().mockReturnValue({
															limit: vi.fn().mockResolvedValue({ data: mockEvents, error: null })
														})
													})
												})
											})
										})
									})
								})
							})
						})
					})
				})
			});

			// Mock second query chain (RSVPs) - returns null
			mockSupabase.from.mockReturnValueOnce({
				select: vi.fn().mockReturnValue({
					in: vi.fn().mockResolvedValue({ data: null, error: null })
				})
			});

			const results = await fetchNearbyEvents(mockSupabase, userCoords);

			expect(results).toHaveLength(1);
			expect(results[0].going_count).toBe(0);
			expect(results[0].interested_count).toBe(0);
		});

		it('should use default radius and limit', async () => {
			const userCoords: Coordinates = { lat: 37.7749, lng: -122.4194 };

			const limitMock = vi.fn().mockResolvedValue({ data: [], error: null });

			// Mock first query chain (events)
			mockSupabase.from.mockReturnValueOnce({
				select: vi.fn().mockReturnValue({
					in: vi.fn().mockReturnValue({
						not: vi.fn().mockReturnValue({
							not: vi.fn().mockReturnValue({
								gte: vi.fn().mockReturnValue({
									lte: vi.fn().mockReturnValue({
										gte: vi.fn().mockReturnValue({
											lte: vi.fn().mockReturnValue({
												gte: vi.fn().mockReturnValue({
													eq: vi.fn().mockReturnValue({
														order: vi.fn().mockReturnValue({
															limit: limitMock
														})
													})
												})
											})
										})
									})
								})
							})
						})
					})
				})
			});

			await fetchNearbyEvents(mockSupabase, userCoords);

			// Verify limit was called with default * 2
			expect(limitMock).toHaveBeenCalledWith(40); // default 20 * 2
		});
	});

	describe('fetchUserLocation', () => {
		it('should return user coordinates when available', async () => {
			const mockUser = {
				location_lat: 37.7749,
				location_lng: -122.4194
			};

			mockSupabase.from.mockReturnValue({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						single: vi.fn().mockResolvedValue({ data: mockUser, error: null })
					})
				})
			});

			const result = await fetchUserLocation(mockSupabase, 'user-123');

			expect(result).toEqual({ lat: 37.7749, lng: -122.4194 });
		});

		it('should return null when user has no location', async () => {
			const mockUser = {
				location_lat: null,
				location_lng: null
			};

			mockSupabase.from.mockReturnValue({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						single: vi.fn().mockResolvedValue({ data: mockUser, error: null })
					})
				})
			});

			const result = await fetchUserLocation(mockSupabase, 'user-123');

			expect(result).toBeNull();
		});

		it('should return null when database error occurs', async () => {
			mockSupabase.from.mockReturnValue({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						single: vi.fn().mockResolvedValue({ data: null, error: { message: 'User not found' } })
					})
				})
			});

			const result = await fetchUserLocation(mockSupabase, 'user-123');

			expect(result).toBeNull();
		});

		it('should return null when lat is null but lng is not', async () => {
			const mockUser = {
				location_lat: null,
				location_lng: -122.4194
			};

			mockSupabase.from.mockReturnValue({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						single: vi.fn().mockResolvedValue({ data: mockUser, error: null })
					})
				})
			});

			const result = await fetchUserLocation(mockSupabase, 'user-123');

			expect(result).toBeNull();
		});

		it('should return null when lng is null but lat is not', async () => {
			const mockUser = {
				location_lat: 37.7749,
				location_lng: null
			};

			mockSupabase.from.mockReturnValue({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						single: vi.fn().mockResolvedValue({ data: mockUser, error: null })
					})
				})
			});

			const result = await fetchUserLocation(mockSupabase, 'user-123');

			expect(result).toBeNull();
		});
	});
});
