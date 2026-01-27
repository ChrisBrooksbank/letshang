/**
 * Tests for Calendar Server Functions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchUserCalendarEvents, fetchUserGroups } from './calendar';
import { supabase } from './supabase';

// Mock Supabase
vi.mock('./supabase', () => ({
	supabase: {
		from: vi.fn()
	}
}));

describe('Calendar Server Functions', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('fetchUserCalendarEvents', () => {
		it('should fetch events for user', async () => {
			const mockData = [
				{
					id: 'rsvp-1',
					status: 'going',
					attendance_mode: 'in_person',
					events: {
						id: 'event-1',
						title: 'Test Event',
						start_time: '2026-01-27T19:00:00Z',
						end_time: '2026-01-27T21:00:00Z',
						event_type: 'in_person',
						venue_name: 'Test Venue',
						venue_address: '123 Test St',
						video_link: null,
						group_id: 'group-1',
						groups: { name: 'Test Group' }
					}
				}
			];

			const mockQuery = {
				eq: vi.fn().mockReturnThis(),
				order: vi.fn().mockResolvedValue({ data: mockData, error: null }),
				gte: vi.fn().mockReturnThis(),
				lte: vi.fn().mockReturnThis(),
				in: vi.fn().mockReturnThis()
			};

			const mockSelect = vi.fn().mockReturnValue(mockQuery);
			vi.mocked(supabase.from).mockReturnValue({ select: mockSelect } as never);

			const result = await fetchUserCalendarEvents('user-1');

			expect(result.error).toBeNull();
			expect(result.events).toHaveLength(1);
			expect(result.events[0]).toMatchObject({
				id: 'event-1',
				title: 'Test Event',
				group_name: 'Test Group',
				rsvp_status: 'going',
				attendance_mode: 'in_person'
			});

			expect(supabase.from).toHaveBeenCalledWith('event_rsvps');
			expect(mockSelect).toHaveBeenCalled();
			expect(mockQuery.eq).toHaveBeenCalledWith('user_id', 'user-1');
		});

		it('should filter by start date', async () => {
			const mockData: never[] = [];

			// Create a mock that returns a promise when called
			const mockGte = vi.fn().mockReturnValue(Promise.resolve({ data: mockData, error: null }));
			const mockQuery = {
				eq: vi.fn().mockReturnThis(),
				order: vi.fn().mockReturnThis(),
				gte: mockGte,
				lte: vi.fn().mockReturnThis(),
				in: vi.fn().mockReturnThis()
			};

			const mockSelect = vi.fn().mockReturnValue(mockQuery);
			vi.mocked(supabase.from).mockReturnValue({ select: mockSelect } as never);

			const result = await fetchUserCalendarEvents('user-1', {
				startDate: '2026-01-01T00:00:00Z'
			});

			expect(result.events).toEqual([]);
			expect(mockGte).toHaveBeenCalledWith('events.start_time', '2026-01-01T00:00:00Z');
		});

		it('should filter by end date', async () => {
			const mockData: never[] = [];

			const mockLte = vi.fn().mockReturnValue(Promise.resolve({ data: mockData, error: null }));
			const mockQuery = {
				eq: vi.fn().mockReturnThis(),
				order: vi.fn().mockReturnThis(),
				gte: vi.fn().mockReturnThis(),
				lte: mockLte,
				in: vi.fn().mockReturnThis()
			};

			const mockSelect = vi.fn().mockReturnValue(mockQuery);
			vi.mocked(supabase.from).mockReturnValue({ select: mockSelect } as never);

			const result = await fetchUserCalendarEvents('user-1', {
				endDate: '2026-01-31T23:59:59Z'
			});

			expect(result.events).toEqual([]);
			expect(mockLte).toHaveBeenCalledWith('events.start_time', '2026-01-31T23:59:59Z');
		});

		it('should filter by group', async () => {
			const mockData: never[] = [];

			// Create a chain where the second eq() call returns a promise
			const secondEq = vi.fn().mockResolvedValue({ data: mockData, error: null });
			const firstEqReturn = {
				eq: secondEq,
				order: vi.fn().mockReturnThis(),
				gte: vi.fn().mockReturnThis(),
				lte: vi.fn().mockReturnThis(),
				in: vi.fn().mockReturnThis()
			};

			const mockEq = vi.fn().mockReturnValue(firstEqReturn);
			const mockQuery = {
				eq: mockEq,
				order: vi.fn().mockReturnThis(),
				gte: vi.fn().mockReturnThis(),
				lte: vi.fn().mockReturnThis(),
				in: vi.fn().mockReturnThis()
			};

			const mockSelect = vi.fn().mockReturnValue(mockQuery);
			vi.mocked(supabase.from).mockReturnValue({ select: mockSelect } as never);

			const result = await fetchUserCalendarEvents('user-1', {
				groupId: 'group-1'
			});

			expect(result.events).toEqual([]);
			// Verify the groupId filter was applied
			expect(secondEq).toHaveBeenCalledWith('events.group_id', 'group-1');
		});

		it('should filter by RSVP statuses', async () => {
			const mockData: never[] = [];

			const mockIn = vi.fn().mockReturnValue(Promise.resolve({ data: mockData, error: null }));
			const mockQuery = {
				eq: vi.fn().mockReturnThis(),
				order: vi.fn().mockReturnThis(),
				gte: vi.fn().mockReturnThis(),
				lte: vi.fn().mockReturnThis(),
				in: mockIn
			};

			const mockSelect = vi.fn().mockReturnValue(mockQuery);
			vi.mocked(supabase.from).mockReturnValue({ select: mockSelect } as never);

			const result = await fetchUserCalendarEvents('user-1', {
				statuses: ['going', 'interested']
			});

			expect(result.events).toEqual([]);
			expect(mockIn).toHaveBeenCalledWith('status', ['going', 'interested']);
		});

		it('should handle events without groups', async () => {
			const mockData = [
				{
					id: 'rsvp-1',
					status: 'going',
					attendance_mode: null,
					events: {
						id: 'event-1',
						title: 'Standalone Event',
						start_time: '2026-01-27T19:00:00Z',
						end_time: null,
						event_type: 'online',
						venue_name: null,
						venue_address: null,
						video_link: 'https://zoom.us/meeting',
						group_id: null,
						groups: null
					}
				}
			];

			const mockQuery = {
				eq: vi.fn().mockReturnThis(),
				order: vi.fn().mockResolvedValue({ data: mockData, error: null }),
				gte: vi.fn().mockReturnThis(),
				lte: vi.fn().mockReturnThis(),
				in: vi.fn().mockReturnThis()
			};

			const mockSelect = vi.fn().mockReturnValue(mockQuery);
			vi.mocked(supabase.from).mockReturnValue({ select: mockSelect } as never);

			const result = await fetchUserCalendarEvents('user-1');

			expect(result.error).toBeNull();
			expect(result.events[0].group_name).toBeNull();
			expect(result.events[0].group_id).toBeNull();
		});

		it('should handle database errors', async () => {
			const mockQuery = {
				eq: vi.fn().mockReturnThis(),
				order: vi.fn().mockResolvedValue({ data: null, error: { message: 'Database error' } }),
				gte: vi.fn().mockReturnThis(),
				lte: vi.fn().mockReturnThis(),
				in: vi.fn().mockReturnThis()
			};

			const mockSelect = vi.fn().mockReturnValue(mockQuery);
			vi.mocked(supabase.from).mockReturnValue({ select: mockSelect } as never);

			const result = await fetchUserCalendarEvents('user-1');

			expect(result.error).toBe('Database error');
			expect(result.events).toEqual([]);
		});

		it('should handle exceptions', async () => {
			vi.mocked(supabase.from).mockImplementation(() => {
				throw new Error('Connection failed');
			});

			const result = await fetchUserCalendarEvents('user-1');

			expect(result.error).toBe('Connection failed');
			expect(result.events).toEqual([]);
		});
	});

	describe('fetchUserGroups', () => {
		it('should fetch active groups for user', async () => {
			const mockData = [
				{
					groups: {
						id: 'group-1',
						name: 'Test Group 1'
					}
				},
				{
					groups: {
						id: 'group-2',
						name: 'Test Group 2'
					}
				}
			];

			const mockQuery = {
				eq: vi.fn().mockReturnThis(),
				order: vi.fn().mockResolvedValue({ data: mockData, error: null })
			};

			const mockSelect = vi.fn().mockReturnValue(mockQuery);
			vi.mocked(supabase.from).mockReturnValue({ select: mockSelect } as never);

			const result = await fetchUserGroups('user-1');

			expect(result.error).toBeNull();
			expect(result.groups).toHaveLength(2);
			expect(result.groups[0]).toEqual({ id: 'group-1', name: 'Test Group 1' });
			expect(result.groups[1]).toEqual({ id: 'group-2', name: 'Test Group 2' });

			expect(supabase.from).toHaveBeenCalledWith('group_members');
			expect(mockQuery.eq).toHaveBeenCalledWith('user_id', 'user-1');
			expect(mockQuery.eq).toHaveBeenCalledWith('status', 'active');
		});

		it('should handle empty results', async () => {
			const mockQuery = {
				eq: vi.fn().mockReturnThis(),
				order: vi.fn().mockResolvedValue({ data: [], error: null })
			};

			const mockSelect = vi.fn().mockReturnValue(mockQuery);
			vi.mocked(supabase.from).mockReturnValue({ select: mockSelect } as never);

			const result = await fetchUserGroups('user-1');

			expect(result.error).toBeNull();
			expect(result.groups).toEqual([]);
		});

		it('should handle database errors', async () => {
			const mockQuery = {
				eq: vi.fn().mockReturnThis(),
				order: vi.fn().mockResolvedValue({ data: null, error: { message: 'Database error' } })
			};

			const mockSelect = vi.fn().mockReturnValue(mockQuery);
			vi.mocked(supabase.from).mockReturnValue({ select: mockSelect } as never);

			const result = await fetchUserGroups('user-1');

			expect(result.error).toBe('Database error');
			expect(result.groups).toEqual([]);
		});

		it('should handle exceptions', async () => {
			vi.mocked(supabase.from).mockImplementation(() => {
				throw new Error('Connection failed');
			});

			const result = await fetchUserGroups('user-1');

			expect(result.error).toBe('Connection failed');
			expect(result.groups).toEqual([]);
		});
	});
});
