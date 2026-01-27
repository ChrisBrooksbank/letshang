import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PageServerLoad } from './$types';
import * as happeningNowModule from '$lib/server/happening-now';
import * as happeningTodayModule from '$lib/server/happening-today';

// Mock the modules
vi.mock('$lib/server/happening-now', () => ({
	fetchHappeningNowEvents: vi.fn()
}));

vi.mock('$lib/server/happening-today', () => ({
	fetchHappeningTodayEvents: vi.fn()
}));

// Import load function after mocking
let load: PageServerLoad;

describe('Dashboard Page Server', () => {
	beforeEach(async () => {
		vi.clearAllMocks();
		// Dynamically import to get fresh module with mocks
		const module = await import('./+page.server');
		load = module.load;
	});

	it('should fetch happening now events and happening today events successfully', async () => {
		const mockNowEvents = [
			{
				id: 'event-1',
				title: 'Test Event Now',
				description: 'Test description',
				start_time: '2026-01-27T10:00:00Z',
				end_time: '2026-01-27T12:00:00Z',
				event_type: 'in_person',
				venue_name: 'Test Venue',
				venue_address: '123 Test St',
				capacity: 50,
				cover_image_url: null,
				visibility: 'public',
				creator_id: 'user-1',
				group_id: null,
				event_size: 'medium'
			}
		];

		const mockTodayEvents = [
			{
				id: 'event-2',
				title: 'Test Event Today',
				description: 'Test description',
				start_time: '2026-01-27T14:00:00Z',
				end_time: '2026-01-27T16:00:00Z',
				event_type: 'online',
				venue_name: null,
				venue_address: null,
				capacity: 30,
				cover_image_url: null,
				visibility: 'public',
				creator_id: 'user-2',
				group_id: null,
				event_size: 'small'
			}
		];

		vi.mocked(happeningNowModule.fetchHappeningNowEvents).mockResolvedValue(mockNowEvents);
		vi.mocked(happeningTodayModule.fetchHappeningTodayEvents).mockResolvedValue(mockTodayEvents);

		const result = (await load({} as never)) as {
			happeningNowEvents: typeof mockNowEvents;
			happeningTodayEvents: typeof mockTodayEvents;
		};

		expect(result.happeningNowEvents).toEqual(mockNowEvents);
		expect(result.happeningTodayEvents).toEqual(mockTodayEvents);
		expect(happeningNowModule.fetchHappeningNowEvents).toHaveBeenCalledWith(expect.anything(), 10);
		expect(happeningTodayModule.fetchHappeningTodayEvents).toHaveBeenCalledWith(
			expect.anything(),
			20
		);
	});

	it('should return empty arrays on error', async () => {
		vi.mocked(happeningNowModule.fetchHappeningNowEvents).mockRejectedValue(
			new Error('Database error')
		);
		vi.mocked(happeningTodayModule.fetchHappeningTodayEvents).mockRejectedValue(
			new Error('Database error')
		);

		const result = (await load({} as never)) as {
			happeningNowEvents: unknown[];
			happeningTodayEvents: unknown[];
		};

		expect(result.happeningNowEvents).toEqual([]);
		expect(result.happeningTodayEvents).toEqual([]);
	});

	it('should limit happening now results to 10 events', async () => {
		vi.mocked(happeningNowModule.fetchHappeningNowEvents).mockResolvedValue([]);
		vi.mocked(happeningTodayModule.fetchHappeningTodayEvents).mockResolvedValue([]);

		await load({} as never);

		expect(happeningNowModule.fetchHappeningNowEvents).toHaveBeenCalledWith(expect.anything(), 10);
	});

	it('should limit happening today results to 20 events', async () => {
		vi.mocked(happeningNowModule.fetchHappeningNowEvents).mockResolvedValue([]);
		vi.mocked(happeningTodayModule.fetchHappeningTodayEvents).mockResolvedValue([]);

		await load({} as never);

		expect(happeningTodayModule.fetchHappeningTodayEvents).toHaveBeenCalledWith(
			expect.anything(),
			20
		);
	});

	it('should fetch both event types in parallel', async () => {
		vi.mocked(happeningNowModule.fetchHappeningNowEvents).mockResolvedValue([]);
		vi.mocked(happeningTodayModule.fetchHappeningTodayEvents).mockResolvedValue([]);

		await load({} as never);

		// Both functions should be called
		expect(happeningNowModule.fetchHappeningNowEvents).toHaveBeenCalled();
		expect(happeningTodayModule.fetchHappeningTodayEvents).toHaveBeenCalled();
	});
});
