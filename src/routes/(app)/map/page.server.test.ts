import { describe, it, expect, vi, beforeEach } from 'vitest';
import { load } from './+page.server';

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
});
