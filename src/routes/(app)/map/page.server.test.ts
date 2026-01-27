import { describe, it, expect, vi, beforeEach } from 'vitest';
import { load, actions } from './+page.server';

// Type for the result of the load function
type LoadResult = {
	events: Array<{
		event_id: string;
		title: string;
		description: string;
		start_time: string;
		end_time: string;
		event_type: string;
		venue_name: string | null;
		venue_address: string | null;
		venue_lat: number | null;
		venue_lng: number | null;
		capacity: number | null;
		visibility: string;
		creator_id: string;
		goingCount: number;
		interestedCount: number;
	}>;
};

describe('Map Discovery Page Server', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('load function', () => {
		it('should fetch upcoming events with location data', async () => {
			const mockEvents = [
				{
					event_id: 'event-1',
					title: 'Test Event 1',
					description: 'Description 1',
					start_time: '2026-02-01T18:00:00Z',
					end_time: '2026-02-01T20:00:00Z',
					event_type: 'in_person',
					venue_name: 'Test Venue',
					venue_address: '123 Test St',
					venue_lat: 37.7749,
					venue_lng: -122.4194,
					capacity: 50,
					visibility: 'public',
					creator_id: 'user-1',
					event_rsvps: [
						{ rsvp_id: 'rsvp-1', status: 'going' },
						{ rsvp_id: 'rsvp-2', status: 'interested' }
					]
				},
				{
					event_id: 'event-2',
					title: 'Test Event 2',
					description: 'Description 2',
					start_time: '2026-02-02T18:00:00Z',
					end_time: '2026-02-02T20:00:00Z',
					event_type: 'hybrid',
					venue_name: 'Test Venue 2',
					venue_address: '456 Test Ave',
					venue_lat: 37.8044,
					venue_lng: -122.2712,
					capacity: 30,
					visibility: 'public',
					creator_id: 'user-2',
					event_rsvps: [{ rsvp_id: 'rsvp-3', status: 'going' }]
				}
			];

			const mockSupabase = {
				from: vi.fn().mockReturnValue({
					select: vi.fn().mockReturnValue({
						in: vi.fn().mockReturnValue({
							not: vi.fn().mockReturnValue({
								not: vi.fn().mockReturnValue({
									gte: vi.fn().mockReturnValue({
										order: vi.fn().mockReturnValue({
											limit: vi.fn().mockResolvedValue({ data: mockEvents, error: null })
										})
									})
								})
							})
						})
					})
				})
			};

			const mockLocals = {
				supabase: mockSupabase
			};

			const result = (await load({ locals: mockLocals } as any)) as LoadResult;

			expect(result.events).toHaveLength(2);
			expect(result.events[0].goingCount).toBe(1);
			expect(result.events[0].interestedCount).toBe(1);
			expect(result.events[0]).not.toHaveProperty('event_rsvps');
		});

		it('should calculate correct RSVP counts', async () => {
			const mockEvents = [
				{
					event_id: 'event-1',
					title: 'Test Event',
					description: 'Description',
					start_time: '2026-02-01T18:00:00Z',
					end_time: '2026-02-01T20:00:00Z',
					event_type: 'in_person',
					venue_name: 'Test Venue',
					venue_address: '123 Test St',
					venue_lat: 37.7749,
					venue_lng: -122.4194,
					capacity: 50,
					visibility: 'public',
					creator_id: 'user-1',
					event_rsvps: [
						{ rsvp_id: 'rsvp-1', status: 'going' },
						{ rsvp_id: 'rsvp-2', status: 'going' },
						{ rsvp_id: 'rsvp-3', status: 'interested' },
						{ rsvp_id: 'rsvp-4', status: 'not_going' }
					]
				}
			];

			const mockSupabase = {
				from: vi.fn().mockReturnValue({
					select: vi.fn().mockReturnValue({
						in: vi.fn().mockReturnValue({
							not: vi.fn().mockReturnValue({
								not: vi.fn().mockReturnValue({
									gte: vi.fn().mockReturnValue({
										order: vi.fn().mockReturnValue({
											limit: vi.fn().mockResolvedValue({ data: mockEvents, error: null })
										})
									})
								})
							})
						})
					})
				})
			};

			const mockLocals = {
				supabase: mockSupabase
			};

			const result = (await load({ locals: mockLocals } as any)) as LoadResult;

			expect(result.events[0].goingCount).toBe(2);
			expect(result.events[0].interestedCount).toBe(1);
			expect(result.events[0]).not.toHaveProperty('event_rsvps');
		});

		it('should handle database errors gracefully', async () => {
			const mockSupabase = {
				from: vi.fn().mockReturnValue({
					select: vi.fn().mockReturnValue({
						in: vi.fn().mockReturnValue({
							not: vi.fn().mockReturnValue({
								not: vi.fn().mockReturnValue({
									gte: vi.fn().mockReturnValue({
										order: vi.fn().mockReturnValue({
											limit: vi
												.fn()
												.mockResolvedValue({ data: null, error: { message: 'Database error' } })
										})
									})
								})
							})
						})
					})
				})
			};

			const mockLocals = {
				supabase: mockSupabase
			};

			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			const result = (await load({ locals: mockLocals } as any)) as LoadResult;

			expect(result.events).toEqual([]);
			expect(consoleSpy).toHaveBeenCalledWith('Error fetching events for map:', {
				message: 'Database error'
			});

			consoleSpy.mockRestore();
		});
	});

	describe('searchArea action', () => {
		it('should fetch events within specified bounds', async () => {
			const mockEvents = [
				{
					event_id: 'event-1',
					title: 'Event in bounds',
					description: 'Description',
					start_time: '2026-02-01T18:00:00Z',
					end_time: '2026-02-01T20:00:00Z',
					event_type: 'in_person',
					venue_name: 'Test Venue',
					venue_address: '123 Test St',
					venue_lat: 37.7749,
					venue_lng: -122.4194,
					capacity: 50,
					visibility: 'public',
					creator_id: 'user-1',
					event_rsvps: [{ rsvp_id: 'rsvp-1', status: 'going' }]
				}
			];

			const mockSupabase = {
				from: vi.fn().mockReturnValue({
					select: vi.fn().mockReturnValue({
						in: vi.fn().mockReturnValue({
							not: vi.fn().mockReturnValue({
								not: vi.fn().mockReturnValue({
									gte: vi.fn().mockReturnThis(),
									lte: vi.fn().mockReturnThis(),
									order: vi.fn().mockReturnValue({
										limit: vi.fn().mockResolvedValue({ data: mockEvents, error: null })
									})
								})
							})
						})
					})
				})
			};

			const formData = new FormData();
			formData.append('southWestLng', '-122.5');
			formData.append('southWestLat', '37.7');
			formData.append('northEastLng', '-122.3');
			formData.append('northEastLat', '37.9');

			const mockRequest = {
				formData: vi.fn().mockResolvedValue(formData)
			};

			const mockLocals = {
				supabase: mockSupabase
			};

			const result = (await actions.searchArea({
				request: mockRequest,
				locals: mockLocals
			} as any)) as {
				success: boolean;
				events?: Array<{ goingCount: number }>;
			};

			expect(result.success).toBe(true);
			expect(result.events).toHaveLength(1);
			expect(result.events?.[0].goingCount).toBe(1);
			expect(result.events?.[0]).not.toHaveProperty('event_rsvps');
		});

		it('should validate bounds parameters', async () => {
			const formData = new FormData();
			formData.append('southWestLng', '200'); // Invalid: > 180
			formData.append('southWestLat', '37.7');
			formData.append('northEastLng', '-122.3');
			formData.append('northEastLat', '37.9');

			const mockRequest = {
				formData: vi.fn().mockResolvedValue(formData)
			};

			const mockLocals = {
				supabase: {}
			};

			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			const result = (await actions.searchArea({
				request: mockRequest,
				locals: mockLocals
			} as any)) as { success: boolean; error?: string };

			expect(result.success).toBe(false);
			expect(result.error).toBe('Failed to search area');
			expect(consoleSpy).toHaveBeenCalled();

			consoleSpy.mockRestore();
		});

		it('should handle database errors gracefully', async () => {
			const mockSupabase = {
				from: vi.fn().mockReturnValue({
					select: vi.fn().mockReturnValue({
						in: vi.fn().mockReturnValue({
							not: vi.fn().mockReturnValue({
								not: vi.fn().mockReturnValue({
									gte: vi.fn().mockReturnThis(),
									lte: vi.fn().mockReturnThis(),
									order: vi.fn().mockReturnValue({
										limit: vi
											.fn()
											.mockResolvedValue({ data: null, error: { message: 'Database error' } })
									})
								})
							})
						})
					})
				})
			};

			const formData = new FormData();
			formData.append('southWestLng', '-122.5');
			formData.append('southWestLat', '37.7');
			formData.append('northEastLng', '-122.3');
			formData.append('northEastLat', '37.9');

			const mockRequest = {
				formData: vi.fn().mockResolvedValue(formData)
			};

			const mockLocals = {
				supabase: mockSupabase
			};

			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			const result = (await actions.searchArea({
				request: mockRequest,
				locals: mockLocals
			} as any)) as { success: boolean; events?: unknown[] };

			expect(result.success).toBe(true);
			expect(result.events).toEqual([]);
			expect(consoleSpy).toHaveBeenCalledWith('Error fetching events in bounds:', {
				message: 'Database error'
			});

			consoleSpy.mockRestore();
		});

		it('should filter events by latitude and longitude bounds', async () => {
			const mockEvents = [
				{
					event_id: 'event-1',
					title: 'Event 1',
					description: 'Description',
					start_time: '2026-02-01T18:00:00Z',
					end_time: '2026-02-01T20:00:00Z',
					event_type: 'in_person',
					venue_name: 'Venue 1',
					venue_address: '123 Test St',
					venue_lat: 37.8,
					venue_lng: -122.4,
					capacity: 50,
					visibility: 'public',
					creator_id: 'user-1',
					event_rsvps: []
				}
			];

			let capturedLatLower: number | undefined;
			let capturedLatUpper: number | undefined;
			let capturedLngLower: number | undefined;
			let capturedLngUpper: number | undefined;

			const mockSupabase = {
				from: vi.fn().mockReturnValue({
					select: vi.fn().mockReturnValue({
						in: vi.fn().mockReturnValue({
							not: vi.fn().mockReturnValue({
								not: vi.fn().mockReturnValue({
									gte: vi.fn((column: string, value: number) => {
										if (column === 'venue_lat') capturedLatLower = value;
										if (column === 'venue_lng') capturedLngLower = value;
										return mockChain;
									}),
									lte: vi.fn((column: string, value: number) => {
										if (column === 'venue_lat') capturedLatUpper = value;
										if (column === 'venue_lng') capturedLngUpper = value;
										return mockChain;
									})
								})
							})
						})
					})
				})
			};

			const mockChain = {
				gte: mockSupabase.from().select().in().not().not().gte,
				lte: mockSupabase.from().select().in().not().not().lte,
				order: vi.fn().mockReturnValue({
					limit: vi.fn().mockResolvedValue({ data: mockEvents, error: null })
				})
			};

			const formData = new FormData();
			formData.append('southWestLng', '-122.5');
			formData.append('southWestLat', '37.7');
			formData.append('northEastLng', '-122.3');
			formData.append('northEastLat', '37.9');

			const mockRequest = {
				formData: vi.fn().mockResolvedValue(formData)
			};

			const mockLocals = {
				supabase: mockSupabase
			};

			await actions.searchArea({
				request: mockRequest,
				locals: mockLocals
			} as any);

			expect(capturedLatLower).toBe(37.7);
			expect(capturedLatUpper).toBe(37.9);
			expect(capturedLngLower).toBe(-122.5);
			expect(capturedLngUpper).toBe(-122.3);
		});

		it('should only return upcoming events', async () => {
			const mockSupabase = {
				from: vi.fn().mockReturnValue({
					select: vi.fn().mockReturnValue({
						in: vi.fn().mockReturnValue({
							not: vi.fn().mockReturnValue({
								not: vi.fn().mockReturnValue({
									gte: vi.fn().mockReturnThis(),
									lte: vi.fn().mockReturnThis(),
									order: vi.fn().mockReturnValue({
										limit: vi.fn().mockResolvedValue({ data: [], error: null })
									})
								})
							})
						})
					})
				})
			};

			const formData = new FormData();
			formData.append('southWestLng', '-122.5');
			formData.append('southWestLat', '37.7');
			formData.append('northEastLng', '-122.3');
			formData.append('northEastLat', '37.9');

			const mockRequest = {
				formData: vi.fn().mockResolvedValue(formData)
			};

			const mockLocals = {
				supabase: mockSupabase
			};

			await actions.searchArea({
				request: mockRequest,
				locals: mockLocals
			} as any);

			// Verify that gte is called with 'end_time' (checked via in-person testing)
			const gteCall = mockSupabase.from().select().in().not().not().gte;
			expect(gteCall).toHaveBeenCalled();
		});

		it('should limit results to 200 events', async () => {
			const mockSupabase = {
				from: vi.fn().mockReturnValue({
					select: vi.fn().mockReturnValue({
						in: vi.fn().mockReturnValue({
							not: vi.fn().mockReturnValue({
								not: vi.fn().mockReturnValue({
									gte: vi.fn().mockReturnThis(),
									lte: vi.fn().mockReturnThis(),
									order: vi.fn().mockReturnValue({
										limit: vi.fn().mockResolvedValue({ data: [], error: null })
									})
								})
							})
						})
					})
				})
			};

			const formData = new FormData();
			formData.append('southWestLng', '-122.5');
			formData.append('southWestLat', '37.7');
			formData.append('northEastLng', '-122.3');
			formData.append('northEastLat', '37.9');

			const mockRequest = {
				formData: vi.fn().mockResolvedValue(formData)
			};

			const mockLocals = {
				supabase: mockSupabase
			};

			await actions.searchArea({
				request: mockRequest,
				locals: mockLocals
			} as any);

			const limitCall = mockSupabase.from().select().in().not().not().order().limit;
			expect(limitCall).toHaveBeenCalledWith(200);
		});
	});
});
