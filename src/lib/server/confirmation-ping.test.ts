/**
 * Tests for Confirmation Ping Processing
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	fetchRsvpsNeedingConfirmation,
	sendConfirmationPing,
	markConfirmationSent,
	confirmAttendance,
	bailOutAttendance,
	processConfirmationPings,
	getConfirmationStats
} from './confirmation-ping';
import { supabaseAdmin } from './supabase';

// Mock the supabase module
vi.mock('./supabase', () => ({
	supabaseAdmin: {
		from: vi.fn(),
		rpc: vi.fn()
	}
}));

describe('Confirmation Ping Processing', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('fetchRsvpsNeedingConfirmation', () => {
		it('should fetch RSVPs for today that need confirmation', async () => {
			const mockRsvps = [
				{
					id: 'rsvp-1',
					user_id: 'user-1',
					event_id: 'event-1',
					events: {
						id: 'event-1',
						title: 'Test Event',
						start_time: new Date().toISOString()
					},
					users: {
						id: 'user-1',
						display_name: 'Test User'
					}
				}
			];

			const mockSelect = vi.fn().mockReturnThis();
			const mockEq = vi.fn().mockReturnThis();
			const mockIs = vi.fn().mockReturnThis();
			const mockGte = vi.fn().mockReturnThis();
			const mockLt = vi.fn().mockReturnThis();
			const mockGt = vi.fn().mockReturnThis();
			const mockLimit = vi.fn().mockResolvedValue({ data: mockRsvps, error: null });

			vi.mocked(supabaseAdmin.from).mockReturnValue({
				select: mockSelect,
				eq: mockEq,
				is: mockIs,
				gte: mockGte,
				lt: mockLt,
				gt: mockGt,
				limit: mockLimit
			} as any);

			const result = await fetchRsvpsNeedingConfirmation();

			expect(result).toHaveLength(1);
			expect(result[0]).toMatchObject({
				rsvpId: 'rsvp-1',
				userId: 'user-1',
				eventId: 'event-1'
			});
			expect(supabaseAdmin.from).toHaveBeenCalledWith('event_rsvps');
		});

		it('should filter by event ID when provided', async () => {
			const mockSelect = vi.fn().mockReturnThis();
			const mockEq = vi.fn().mockReturnThis();
			const mockIs = vi.fn().mockReturnThis();
			const mockGte = vi.fn().mockReturnThis();
			const mockLt = vi.fn().mockReturnThis();
			const mockGt = vi.fn().mockReturnThis();
			const mockLimit = vi.fn().mockResolvedValue({ data: [], error: null });

			vi.mocked(supabaseAdmin.from).mockReturnValue({
				select: mockSelect,
				eq: mockEq,
				is: mockIs,
				gte: mockGte,
				lt: mockLt,
				gt: mockGt,
				limit: mockLimit
			} as any);

			await fetchRsvpsNeedingConfirmation('event-123');

			expect(mockEq).toHaveBeenCalledWith('event_id', 'event-123');
		});

		it('should return empty array when no RSVPs found', async () => {
			const mockSelect = vi.fn().mockReturnThis();
			const mockEq = vi.fn().mockReturnThis();
			const mockIs = vi.fn().mockReturnThis();
			const mockGte = vi.fn().mockReturnThis();
			const mockLt = vi.fn().mockReturnThis();
			const mockGt = vi.fn().mockReturnThis();
			const mockLimit = vi.fn().mockResolvedValue({ data: null, error: null });

			vi.mocked(supabaseAdmin.from).mockReturnValue({
				select: mockSelect,
				eq: mockEq,
				is: mockIs,
				gte: mockGte,
				lt: mockLt,
				gt: mockGt,
				limit: mockLimit
			} as any);

			const result = await fetchRsvpsNeedingConfirmation();

			expect(result).toEqual([]);
		});

		it('should throw error on database failure', async () => {
			const mockSelect = vi.fn().mockReturnThis();
			const mockEq = vi.fn().mockReturnThis();
			const mockIs = vi.fn().mockReturnThis();
			const mockGte = vi.fn().mockReturnThis();
			const mockLt = vi.fn().mockReturnThis();
			const mockGt = vi.fn().mockReturnThis();
			const mockLimit = vi
				.fn()
				.mockResolvedValue({ data: null, error: { message: 'Database error' } });

			vi.mocked(supabaseAdmin.from).mockReturnValue({
				select: mockSelect,
				eq: mockEq,
				is: mockIs,
				gte: mockGte,
				lt: mockLt,
				gt: mockGt,
				limit: mockLimit
			} as any);

			await expect(fetchRsvpsNeedingConfirmation()).rejects.toThrow(
				'Failed to fetch RSVPs needing confirmation'
			);
		});
	});

	describe('sendConfirmationPing', () => {
		it('should log notification and mark as sent', async () => {
			const mockEvent = {
				id: 'event-1',
				title: 'Test Event',
				start_time: new Date().toISOString()
			} as any;

			const mockUser = {
				id: 'user-1',
				display_name: 'Test User'
			} as any;

			// Mock markConfirmationSent
			const mockUpdate = vi.fn().mockReturnThis();
			const mockEq = vi.fn().mockResolvedValue({ error: null });

			vi.mocked(supabaseAdmin.from).mockReturnValue({
				update: mockUpdate,
				eq: mockEq
			} as any);

			const result = await sendConfirmationPing('rsvp-1', mockEvent, mockUser);

			expect(result.success).toBe(true);
			expect(supabaseAdmin.from).toHaveBeenCalledWith('event_rsvps');
		});

		it('should handle errors during send', async () => {
			const mockEvent = {
				id: 'event-1',
				title: 'Test',
				start_time: new Date().toISOString()
			} as any;
			const mockUser = { id: 'user-1', display_name: 'Test' } as any;

			// Mock database error
			const mockUpdate = vi.fn().mockReturnThis();
			const mockEq = vi.fn().mockResolvedValue({ error: { message: 'DB error' } });

			vi.mocked(supabaseAdmin.from).mockReturnValue({
				update: mockUpdate,
				eq: mockEq
			} as any);

			const result = await sendConfirmationPing('rsvp-1', mockEvent, mockUser);

			expect(result.success).toBe(false);
			expect(result.error).toBeDefined();
		});
	});

	describe('markConfirmationSent', () => {
		it('should update confirmation_sent_at timestamp', async () => {
			const mockUpdate = vi.fn().mockReturnThis();
			const mockEq = vi.fn().mockResolvedValue({ error: null });

			vi.mocked(supabaseAdmin.from).mockReturnValue({
				update: mockUpdate,
				eq: mockEq
			} as any);

			await markConfirmationSent('rsvp-1');

			expect(supabaseAdmin.from).toHaveBeenCalledWith('event_rsvps');
			expect(mockUpdate).toHaveBeenCalledWith(
				expect.objectContaining({
					confirmation_sent_at: expect.any(String)
				})
			);
			expect(mockEq).toHaveBeenCalledWith('id', 'rsvp-1');
		});

		it('should throw error on database failure', async () => {
			const mockUpdate = vi.fn().mockReturnThis();
			const mockEq = vi.fn().mockResolvedValue({ error: { message: 'Database error' } });

			vi.mocked(supabaseAdmin.from).mockReturnValue({
				update: mockUpdate,
				eq: mockEq
			} as any);

			await expect(markConfirmationSent('rsvp-1')).rejects.toThrow(
				'Failed to mark confirmation as sent'
			);
		});
	});

	describe('confirmAttendance', () => {
		it('should update confirmation status to confirmed', async () => {
			const mockSelect = vi.fn().mockReturnThis();
			const mockEqSelect = vi.fn().mockReturnThis();
			const mockSingle = vi
				.fn()
				.mockResolvedValue({ data: { user_id: 'user-1', status: 'going' }, error: null });

			const mockUpdate = vi.fn().mockReturnThis();
			const mockEqUpdate = vi.fn().mockResolvedValue({ error: null });

			vi.mocked(supabaseAdmin.from)
				.mockReturnValueOnce({
					select: mockSelect,
					eq: mockEqSelect,
					single: mockSingle
				} as any)
				.mockReturnValueOnce({
					update: mockUpdate,
					eq: mockEqUpdate
				} as any);

			await confirmAttendance('rsvp-1', 'user-1');

			expect(mockUpdate).toHaveBeenCalledWith(
				expect.objectContaining({
					confirmation_status: 'confirmed',
					confirmation_response_at: expect.any(String)
				})
			);
		});

		it('should throw error if RSVP not found', async () => {
			const mockSelect = vi.fn().mockReturnThis();
			const mockEq = vi.fn().mockReturnThis();
			const mockSingle = vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } });

			vi.mocked(supabaseAdmin.from).mockReturnValue({
				select: mockSelect,
				eq: mockEq,
				single: mockSingle
			} as any);

			await expect(confirmAttendance('rsvp-1', 'user-1')).rejects.toThrow('RSVP not found');
		});

		it('should throw error if user not authorized', async () => {
			const mockSelect = vi.fn().mockReturnThis();
			const mockEq = vi.fn().mockReturnThis();
			const mockSingle = vi
				.fn()
				.mockResolvedValue({ data: { user_id: 'other-user', status: 'going' }, error: null });

			vi.mocked(supabaseAdmin.from).mockReturnValue({
				select: mockSelect,
				eq: mockEq,
				single: mockSingle
			} as any);

			await expect(confirmAttendance('rsvp-1', 'user-1')).rejects.toThrow(
				'Not authorized to confirm this RSVP'
			);
		});

		it('should throw error if RSVP status is not going', async () => {
			const mockSelect = vi.fn().mockReturnThis();
			const mockEq = vi.fn().mockReturnThis();
			const mockSingle = vi
				.fn()
				.mockResolvedValue({ data: { user_id: 'user-1', status: 'interested' }, error: null });

			vi.mocked(supabaseAdmin.from).mockReturnValue({
				select: mockSelect,
				eq: mockEq,
				single: mockSingle
			} as any);

			await expect(confirmAttendance('rsvp-1', 'user-1')).rejects.toThrow(
				'Can only confirm "going" RSVPs'
			);
		});
	});

	describe('bailOutAttendance', () => {
		it('should call bail_out_attendance function with reason', async () => {
			const mockSelect = vi.fn().mockReturnThis();
			const mockEq = vi.fn().mockReturnThis();
			const mockSingle = vi.fn().mockResolvedValue({
				data: { user_id: 'user-1', status: 'going', event_id: 'event-1' },
				error: null
			});

			vi.mocked(supabaseAdmin.from).mockReturnValue({
				select: mockSelect,
				eq: mockEq,
				single: mockSingle
			} as any);

			vi.mocked(supabaseAdmin.rpc).mockResolvedValue({ error: null } as any);

			await bailOutAttendance('rsvp-1', 'user-1', 'Family emergency');

			expect(supabaseAdmin.rpc).toHaveBeenCalledWith('bail_out_attendance', {
				p_rsvp_id: 'rsvp-1',
				p_reason: 'Family emergency'
			});
		});

		it('should handle missing reason', async () => {
			const mockSelect = vi.fn().mockReturnThis();
			const mockEq = vi.fn().mockReturnThis();
			const mockSingle = vi.fn().mockResolvedValue({
				data: { user_id: 'user-1', status: 'going', event_id: 'event-1' },
				error: null
			});

			vi.mocked(supabaseAdmin.from).mockReturnValue({
				select: mockSelect,
				eq: mockEq,
				single: mockSingle
			} as any);

			vi.mocked(supabaseAdmin.rpc).mockResolvedValue({ error: null } as any);

			await bailOutAttendance('rsvp-1', 'user-1');

			expect(supabaseAdmin.rpc).toHaveBeenCalledWith('bail_out_attendance', {
				p_rsvp_id: 'rsvp-1',
				p_reason: null
			});
		});

		it('should throw error if user not authorized', async () => {
			const mockSelect = vi.fn().mockReturnThis();
			const mockEq = vi.fn().mockReturnThis();
			const mockSingle = vi.fn().mockResolvedValue({
				data: { user_id: 'other-user', status: 'going', event_id: 'event-1' },
				error: null
			});

			vi.mocked(supabaseAdmin.from).mockReturnValue({
				select: mockSelect,
				eq: mockEq,
				single: mockSingle
			} as any);

			await expect(bailOutAttendance('rsvp-1', 'user-1')).rejects.toThrow(
				'Not authorized to bail out this RSVP'
			);
		});

		it('should throw error if RSVP status is not going', async () => {
			const mockSelect = vi.fn().mockReturnThis();
			const mockEq = vi.fn().mockReturnThis();
			const mockSingle = vi.fn().mockResolvedValue({
				data: { user_id: 'user-1', status: 'not_going', event_id: 'event-1' },
				error: null
			});

			vi.mocked(supabaseAdmin.from).mockReturnValue({
				select: mockSelect,
				eq: mockEq,
				single: mockSingle
			} as any);

			await expect(bailOutAttendance('rsvp-1', 'user-1')).rejects.toThrow(
				'Can only bail out "going" RSVPs'
			);
		});

		it('should throw error on RPC failure', async () => {
			const mockSelect = vi.fn().mockReturnThis();
			const mockEq = vi.fn().mockReturnThis();
			const mockSingle = vi.fn().mockResolvedValue({
				data: { user_id: 'user-1', status: 'going', event_id: 'event-1' },
				error: null
			});

			vi.mocked(supabaseAdmin.from).mockReturnValue({
				select: mockSelect,
				eq: mockEq,
				single: mockSingle
			} as any);

			vi.mocked(supabaseAdmin.rpc).mockResolvedValue({
				error: { message: 'RPC error' }
			} as any);

			await expect(bailOutAttendance('rsvp-1', 'user-1')).rejects.toThrow('Failed to bail out');
		});
	});

	describe('processConfirmationPings', () => {
		it('should process all RSVPs needing confirmation', async () => {
			// Mock the raw database response format (what the query returns)
			const mockRawRsvp = {
				id: 'rsvp-1',
				user_id: 'user-1',
				event_id: 'event-1',
				events: {
					id: 'event-1',
					title: 'Test Event',
					start_time: new Date().toISOString()
				},
				users: {
					id: 'user-1',
					display_name: 'Test User'
				}
			};

			// Mock fetchRsvpsNeedingConfirmation
			const mockSelect = vi.fn().mockReturnThis();
			const mockEq = vi.fn().mockReturnThis();
			const mockIs = vi.fn().mockReturnThis();
			const mockGte = vi.fn().mockReturnThis();
			const mockLt = vi.fn().mockReturnThis();
			const mockGt = vi.fn().mockReturnThis();
			const mockLimit = vi.fn().mockResolvedValue({ data: [mockRawRsvp], error: null });

			// Mock markConfirmationSent
			const mockUpdate = vi.fn().mockReturnThis();
			const mockEqUpdate = vi.fn().mockResolvedValue({ error: null });

			vi.mocked(supabaseAdmin.from)
				.mockReturnValueOnce({
					select: mockSelect,
					eq: mockEq,
					is: mockIs,
					gte: mockGte,
					lt: mockLt,
					gt: mockGt,
					limit: mockLimit
				} as any)
				.mockReturnValue({
					update: mockUpdate,
					eq: mockEqUpdate
				} as any);

			const result = await processConfirmationPings();

			expect(result.processed).toBe(1);
			expect(result.sent).toBe(1);
			expect(result.failed).toBe(0);
		});

		it('should handle empty queue', async () => {
			const mockSelect = vi.fn().mockReturnThis();
			const mockEq = vi.fn().mockReturnThis();
			const mockIs = vi.fn().mockReturnThis();
			const mockGte = vi.fn().mockReturnThis();
			const mockLt = vi.fn().mockReturnThis();
			const mockGt = vi.fn().mockReturnThis();
			const mockLimit = vi.fn().mockResolvedValue({ data: [], error: null });

			vi.mocked(supabaseAdmin.from).mockReturnValue({
				select: mockSelect,
				eq: mockEq,
				is: mockIs,
				gte: mockGte,
				lt: mockLt,
				gt: mockGt,
				limit: mockLimit
			} as any);

			const result = await processConfirmationPings();

			expect(result.processed).toBe(0);
			expect(result.sent).toBe(0);
			expect(result.failed).toBe(0);
		});
	});

	describe('getConfirmationStats', () => {
		it('should return confirmation statistics', async () => {
			const mockData = [
				{ confirmation_status: 'pending' },
				{ confirmation_status: 'confirmed' },
				{ confirmation_status: 'confirmed' },
				{ confirmation_status: 'bailed_out' }
			];

			const mockSelect = vi.fn().mockReturnThis();
			const mockEq1 = vi.fn().mockReturnThis();
			const mockEq2 = vi.fn().mockResolvedValue({ data: mockData, error: null });

			vi.mocked(supabaseAdmin.from).mockReturnValue({
				select: mockSelect,
				eq: mockEq1.mockReturnValueOnce({ eq: mockEq2 })
			} as any);

			const stats = await getConfirmationStats('event-1');

			expect(stats.total).toBe(4);
			expect(stats.pending).toBe(1);
			expect(stats.confirmed).toBe(2);
			expect(stats.bailedOut).toBe(1);
		});

		it('should handle empty results', async () => {
			const mockSelect = vi.fn().mockReturnThis();
			const mockEq1 = vi.fn().mockReturnThis();
			const mockEq2 = vi.fn().mockResolvedValue({ data: null, error: null });

			vi.mocked(supabaseAdmin.from).mockReturnValue({
				select: mockSelect,
				eq: mockEq1.mockReturnValueOnce({ eq: mockEq2 })
			} as any);

			const stats = await getConfirmationStats('event-1');

			expect(stats.total).toBe(0);
			expect(stats.pending).toBe(0);
			expect(stats.confirmed).toBe(0);
			expect(stats.bailedOut).toBe(0);
		});

		it('should throw error on database failure', async () => {
			const mockSelect = vi.fn().mockReturnThis();
			const mockEq1 = vi.fn().mockReturnThis();
			const mockEq2 = vi
				.fn()
				.mockResolvedValue({ data: null, error: { message: 'Database error' } });

			vi.mocked(supabaseAdmin.from).mockReturnValue({
				select: mockSelect,
				eq: mockEq1.mockReturnValueOnce({ eq: mockEq2 })
			} as any);

			await expect(getConfirmationStats('event-1')).rejects.toThrow(
				'Failed to fetch confirmation stats'
			);
		});
	});
});
