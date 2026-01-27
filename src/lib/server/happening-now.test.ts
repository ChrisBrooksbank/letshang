import { describe, it, expect, vi } from 'vitest';
import { fetchHappeningNowEvents } from './happening-now';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('Happening Now Server Functions', () => {
	describe('fetchHappeningNowEvents', () => {
		it('should fetch events currently in progress', async () => {
			const mockEvents = [
				{
					id: 'event-1',
					title: 'Morning Coffee Chat',
					start_time: '2026-01-27T14:00:00Z',
					end_time: '2026-01-27T16:00:00Z',
					event_type: 'in_person',
					venue_name: 'Coffee Shop'
				},
				{
					id: 'event-2',
					title: 'Lunch Meetup',
					start_time: '2026-01-27T15:00:00Z',
					end_time: '2026-01-27T17:00:00Z',
					event_type: 'in_person',
					venue_name: 'Restaurant'
				}
			];

			const supabase = {
				from: vi.fn().mockReturnValue({
					select: vi.fn().mockReturnValue({
						lte: vi.fn().mockReturnValue({
							gt: vi.fn().mockReturnValue({
								eq: vi.fn().mockReturnValue({
									order: vi.fn().mockResolvedValue({
										data: mockEvents,
										error: null
									})
								})
							})
						})
					})
				})
			} as unknown as SupabaseClient;

			const result = await fetchHappeningNowEvents(supabase);

			expect(result).toEqual(mockEvents);
			expect(supabase.from).toHaveBeenCalledWith('events');
		});

		it('should filter by visibility=public', async () => {
			const supabase = {
				from: vi.fn().mockReturnValue({
					select: vi.fn().mockReturnValue({
						lte: vi.fn().mockReturnValue({
							gt: vi.fn().mockReturnValue({
								eq: vi.fn().mockReturnValue({
									order: vi.fn().mockResolvedValue({
										data: [],
										error: null
									})
								})
							})
						})
					})
				})
			} as unknown as SupabaseClient;

			await fetchHappeningNowEvents(supabase);

			// Verify the query chain includes visibility filter
			const fromMock = supabase.from('events');
			const selectMock = fromMock.select();
			const lteMock = selectMock.lte('start_time', expect.any(String));
			const gtMock = lteMock.gt('end_time', expect.any(String));

			expect(gtMock.eq).toHaveBeenCalledWith('visibility', 'public');
		});

		it('should order by start_time ascending (earliest first)', async () => {
			const supabase = {
				from: vi.fn().mockReturnValue({
					select: vi.fn().mockReturnValue({
						lte: vi.fn().mockReturnValue({
							gt: vi.fn().mockReturnValue({
								eq: vi.fn().mockReturnValue({
									order: vi.fn().mockResolvedValue({
										data: [],
										error: null
									})
								})
							})
						})
					})
				})
			} as unknown as SupabaseClient;

			await fetchHappeningNowEvents(supabase);

			const fromMock = supabase.from('events');
			const selectMock = fromMock.select();
			const lteMock = selectMock.lte('start_time', expect.any(String));
			const gtMock = lteMock.gt('end_time', expect.any(String));
			const eqMock = gtMock.eq('visibility', 'public');

			expect(eqMock.order).toHaveBeenCalledWith('start_time', { ascending: true });
		});

		it('should return empty array when no events are happening', async () => {
			const supabase = {
				from: vi.fn().mockReturnValue({
					select: vi.fn().mockReturnValue({
						lte: vi.fn().mockReturnValue({
							gt: vi.fn().mockReturnValue({
								eq: vi.fn().mockReturnValue({
									order: vi.fn().mockResolvedValue({
										data: [],
										error: null
									})
								})
							})
						})
					})
				})
			} as unknown as SupabaseClient;

			const result = await fetchHappeningNowEvents(supabase);

			expect(result).toEqual([]);
		});

		it('should throw error on database failure', async () => {
			const supabase = {
				from: vi.fn().mockReturnValue({
					select: vi.fn().mockReturnValue({
						lte: vi.fn().mockReturnValue({
							gt: vi.fn().mockReturnValue({
								eq: vi.fn().mockReturnValue({
									order: vi.fn().mockResolvedValue({
										data: null,
										error: { message: 'Database error', code: 'PGRST301' }
									})
								})
							})
						})
					})
				})
			} as unknown as SupabaseClient;

			await expect(fetchHappeningNowEvents(supabase)).rejects.toThrow('Database error');
		});

		it('should apply optional limit parameter', async () => {
			const mockEvents = [
				{
					id: 'event-1',
					title: 'Event 1',
					start_time: '2026-01-27T14:00:00Z',
					end_time: '2026-01-27T16:00:00Z'
				}
			];

			const supabase = {
				from: vi.fn().mockReturnValue({
					select: vi.fn().mockReturnValue({
						lte: vi.fn().mockReturnValue({
							gt: vi.fn().mockReturnValue({
								eq: vi.fn().mockReturnValue({
									order: vi.fn().mockReturnValue({
										limit: vi.fn().mockResolvedValue({
											data: mockEvents,
											error: null
										})
									})
								})
							})
						})
					})
				})
			} as unknown as SupabaseClient;

			const result = await fetchHappeningNowEvents(supabase, 5);

			expect(result).toEqual(mockEvents);

			const fromMock = supabase.from('events');
			const selectMock = fromMock.select();
			const lteMock = selectMock.lte('start_time', expect.any(String));
			const gtMock = lteMock.gt('end_time', expect.any(String));
			const eqMock = gtMock.eq('visibility', 'public');
			const orderMock = eqMock.order('start_time', { ascending: true });

			expect(orderMock.limit).toHaveBeenCalledWith(5);
		});

		it('should not apply limit when parameter is not provided', async () => {
			const supabase = {
				from: vi.fn().mockReturnValue({
					select: vi.fn().mockReturnValue({
						lte: vi.fn().mockReturnValue({
							gt: vi.fn().mockReturnValue({
								eq: vi.fn().mockReturnValue({
									order: vi.fn().mockResolvedValue({
										data: [],
										error: null
									})
								})
							})
						})
					})
				})
			} as unknown as SupabaseClient;

			await fetchHappeningNowEvents(supabase);

			// Verify limit was NOT called
			const fromMock = supabase.from('events');
			const selectMock = fromMock.select();
			const lteMock = selectMock.lte('start_time', expect.any(String));
			const gtMock = lteMock.gt('end_time', expect.any(String));
			const eqMock = gtMock.eq('visibility', 'public');
			const orderMock = eqMock.order('start_time', { ascending: true });

			expect(orderMock.limit).not.toBeDefined();
		});
	});
});
