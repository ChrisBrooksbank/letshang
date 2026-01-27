import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PageServerLoad } from './$types';
import * as happeningNowModule from '$lib/server/happening-now';

// Mock the happening-now module
vi.mock('$lib/server/happening-now', () => ({
	fetchHappeningNowEvents: vi.fn()
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

	it('should fetch happening now events successfully', async () => {
		const mockEvents = [
			{
				id: 'event-1',
				title: 'Test Event',
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

		vi.mocked(happeningNowModule.fetchHappeningNowEvents).mockResolvedValue(mockEvents);

		const result = (await load({} as never)) as { happeningNowEvents: typeof mockEvents };

		expect(result.happeningNowEvents).toEqual(mockEvents);
		expect(happeningNowModule.fetchHappeningNowEvents).toHaveBeenCalledWith(expect.anything(), 10);
	});

	it('should return empty array on error', async () => {
		vi.mocked(happeningNowModule.fetchHappeningNowEvents).mockRejectedValue(
			new Error('Database error')
		);

		const result = (await load({} as never)) as { happeningNowEvents: unknown[] };

		expect(result.happeningNowEvents).toEqual([]);
	});

	it('should limit results to 10 events', async () => {
		vi.mocked(happeningNowModule.fetchHappeningNowEvents).mockResolvedValue([]);

		await load({} as never);

		expect(happeningNowModule.fetchHappeningNowEvents).toHaveBeenCalledWith(expect.anything(), 10);
	});
});
