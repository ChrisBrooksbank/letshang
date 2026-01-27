/**
 * Tests for Calendar Page Server
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { load } from './+page.server';
import * as calendar from '$lib/server/calendar';

// Mock calendar functions
vi.mock('$lib/server/calendar', () => ({
	fetchUserCalendarEvents: vi.fn(),
	fetchUserGroups: vi.fn()
}));

// Mock SvelteKit modules
vi.mock('@sveltejs/kit', () => ({
	redirect: vi.fn((status: number, location: string) => {
		throw new Error(`Redirect: ${status} ${location}`);
	})
}));

describe('Calendar Page Server', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	const mockLocals = {
		session: {
			user: { id: 'user-1' }
		}
	};

	const mockUrl = new URL('http://localhost/calendar');

	it('should redirect to login if not authenticated', async () => {
		const localsWithoutSession = { session: null };

		await expect(
			load({
				locals: localsWithoutSession,
				url: mockUrl
			} as never)
		).rejects.toThrow('Redirect: 303 /login');
	});

	it('should load calendar events and groups', async () => {
		const mockEvents = [
			{
				id: 'event-1',
				title: 'Test Event',
				start_time: '2026-01-27T19:00:00Z',
				end_time: '2026-01-27T21:00:00Z',
				event_type: 'in_person' as const,
				venue_name: 'Test Venue',
				venue_address: '123 Test St',
				video_link: null,
				group_id: 'group-1',
				group_name: 'Test Group',
				rsvp_status: 'going' as const,
				attendance_mode: 'in_person' as const
			}
		];

		const mockGroups = [
			{ id: 'group-1', name: 'Test Group 1' },
			{ id: 'group-2', name: 'Test Group 2' }
		];

		vi.mocked(calendar.fetchUserCalendarEvents).mockResolvedValue({
			events: mockEvents,
			error: null
		});

		vi.mocked(calendar.fetchUserGroups).mockResolvedValue({
			groups: mockGroups,
			error: null
		});

		const result = await load({
			locals: mockLocals,
			url: mockUrl
		} as never);

		if (!result) {
			throw new Error('Load function returned undefined');
		}

		expect(result.events).toEqual(mockEvents);
		expect(result.groups).toEqual(mockGroups);
		expect(result.view).toBe('month');
		expect(result.selectedGroupId).toBeNull();

		expect(calendar.fetchUserCalendarEvents).toHaveBeenCalledWith('user-1', {
			startDate: undefined,
			endDate: undefined,
			groupId: undefined,
			statuses: ['going', 'interested']
		});

		expect(calendar.fetchUserGroups).toHaveBeenCalledWith('user-1');
	});

	it('should handle view parameter', async () => {
		const urlWithView = new URL('http://localhost/calendar?view=week');

		vi.mocked(calendar.fetchUserCalendarEvents).mockResolvedValue({
			events: [],
			error: null
		});

		vi.mocked(calendar.fetchUserGroups).mockResolvedValue({
			groups: [],
			error: null
		});

		const result = await load({
			locals: mockLocals,
			url: urlWithView
		} as never);

		if (!result) {
			throw new Error('Load function returned undefined');
		}

		expect(result.view).toBe('week');
	});

	it('should handle group filter parameter', async () => {
		const urlWithGroup = new URL('http://localhost/calendar?group=group-1');

		vi.mocked(calendar.fetchUserCalendarEvents).mockResolvedValue({
			events: [],
			error: null
		});

		vi.mocked(calendar.fetchUserGroups).mockResolvedValue({
			groups: [],
			error: null
		});

		const result = await load({
			locals: mockLocals,
			url: urlWithGroup
		} as never);

		if (!result) {
			throw new Error('Load function returned undefined');
		}

		expect(result.selectedGroupId).toBe('group-1');

		expect(calendar.fetchUserCalendarEvents).toHaveBeenCalledWith('user-1', {
			startDate: undefined,
			endDate: undefined,
			groupId: 'group-1',
			statuses: ['going', 'interested']
		});
	});

	it('should handle date range parameters', async () => {
		const urlWithDates = new URL(
			'http://localhost/calendar?startDate=2026-01-01T00:00:00Z&endDate=2026-01-31T23:59:59Z'
		);

		vi.mocked(calendar.fetchUserCalendarEvents).mockResolvedValue({
			events: [],
			error: null
		});

		vi.mocked(calendar.fetchUserGroups).mockResolvedValue({
			groups: [],
			error: null
		});

		await load({
			locals: mockLocals,
			url: urlWithDates
		} as never);

		expect(calendar.fetchUserCalendarEvents).toHaveBeenCalledWith('user-1', {
			startDate: '2026-01-01T00:00:00Z',
			endDate: '2026-01-31T23:59:59Z',
			groupId: undefined,
			statuses: ['going', 'interested']
		});
	});

	it('should handle events fetch error gracefully', async () => {
		vi.mocked(calendar.fetchUserCalendarEvents).mockResolvedValue({
			events: [],
			error: 'Database connection failed'
		});

		vi.mocked(calendar.fetchUserGroups).mockResolvedValue({
			groups: [],
			error: null
		});

		// Should not throw, just return empty events
		const result = await load({
			locals: mockLocals,
			url: mockUrl
		} as never);

		if (!result) {
			throw new Error('Load function returned undefined');
		}

		expect(result.events).toEqual([]);
	});

	it('should handle groups fetch error gracefully', async () => {
		vi.mocked(calendar.fetchUserCalendarEvents).mockResolvedValue({
			events: [],
			error: null
		});

		vi.mocked(calendar.fetchUserGroups).mockResolvedValue({
			groups: [],
			error: 'Database connection failed'
		});

		// Should not throw, just return empty groups
		const result = await load({
			locals: mockLocals,
			url: mockUrl
		} as never);

		if (!result) {
			throw new Error('Load function returned undefined');
		}

		expect(result.groups).toEqual([]);
	});
});
