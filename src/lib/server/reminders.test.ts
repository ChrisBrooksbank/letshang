import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
	fetchDueReminders,
	sendReminderEmail,
	markReminderSent,
	markReminderFailed,
	processScheduledReminders,
	cancelRemindersForRsvp
} from './reminders';
import { supabaseAdmin } from './supabase';
import type { Tables } from '$lib/types/database';

// Mock Supabase admin client
vi.mock('./supabase', () => ({
	supabaseAdmin: {
		from: vi.fn()
	}
}));

describe('Server-Side Reminder Processing', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('fetchDueReminders', () => {
		it('should fetch reminders that are due', async () => {
			const mockReminders = [
				{
					id: 'reminder-1',
					event_id: 'event-1',
					user_id: 'user-1',
					reminder_type: 'seven_days' as const,
					scheduled_for: '2026-01-20T09:00:00.000Z',
					status: 'scheduled' as const,
					sent_at: null,
					error_message: null,
					created_at: '2026-01-13T12:00:00.000Z',
					updated_at: '2026-01-13T12:00:00.000Z'
				}
			];

			const mockEvents = [
				{
					id: 'event-1',
					title: 'Test Event',
					description: 'Test description',
					start_time: '2026-01-27T18:00:00.000Z',
					end_time: null,
					event_type: 'in_person' as const,
					visibility: 'public' as const,
					venue_name: 'Test Venue',
					venue_address: '123 Test St',
					venue_lat: null,
					venue_lng: null,
					video_link: null,
					capacity: null,
					format_tags: [],
					accessibility_tags: [],
					creator_id: 'creator-1',
					group_id: null,
					created_at: '2026-01-13T12:00:00.000Z',
					updated_at: '2026-01-13T12:00:00.000Z'
				}
			];

			const mockUsers = [
				{
					id: 'user-1',
					display_name: 'Test User',
					bio: null,
					profile_photo_url: null,
					location: null,
					profile_visibility: 'members_only' as const,
					created_at: '2026-01-01T00:00:00.000Z',
					updated_at: '2026-01-01T00:00:00.000Z'
				}
			];

			const mockFrom = vi.fn().mockReturnValue({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						lte: vi.fn().mockReturnValue({
							order: vi.fn().mockReturnValue({
								limit: vi.fn().mockResolvedValue({ data: mockReminders, error: null })
							})
						})
					})
				})
			});

			vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
				if (table === 'event_reminders') {
					return mockFrom() as any;
				} else if (table === 'events') {
					return {
						select: vi.fn().mockReturnValue({
							in: vi.fn().mockResolvedValue({ data: mockEvents, error: null })
						})
					} as any;
				} else if (table === 'users') {
					return {
						select: vi.fn().mockReturnValue({
							in: vi.fn().mockResolvedValue({ data: mockUsers, error: null })
						})
					} as any;
				}
				return {} as any;
			});

			const result = await fetchDueReminders();

			expect(result).toHaveLength(1);
			expect(result[0].reminder.id).toBe('reminder-1');
			expect(result[0].event.title).toBe('Test Event');
			expect(result[0].user.display_name).toBe('Test User');
		});

		it('should return empty array when no reminders are due', async () => {
			const mockFrom = vi.fn().mockReturnValue({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						lte: vi.fn().mockReturnValue({
							order: vi.fn().mockReturnValue({
								limit: vi.fn().mockResolvedValue({ data: [], error: null })
							})
						})
					})
				})
			});

			vi.mocked(supabaseAdmin.from).mockImplementation(() => mockFrom() as any);

			const result = await fetchDueReminders();

			expect(result).toHaveLength(0);
		});

		it('should throw error on database failure', async () => {
			const mockFrom = vi.fn().mockReturnValue({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						lte: vi.fn().mockReturnValue({
							order: vi.fn().mockReturnValue({
								limit: vi
									.fn()
									.mockResolvedValue({ data: null, error: { message: 'Database error' } })
							})
						})
					})
				})
			});

			vi.mocked(supabaseAdmin.from).mockImplementation(() => mockFrom() as any);

			await expect(fetchDueReminders()).rejects.toThrow('Failed to fetch due reminders');
		});

		it('should filter out reminders with missing event or user data', async () => {
			const mockReminders = [
				{
					id: 'reminder-1',
					event_id: 'event-1',
					user_id: 'user-1',
					reminder_type: 'seven_days' as const,
					scheduled_for: '2026-01-20T09:00:00.000Z',
					status: 'scheduled' as const,
					sent_at: null,
					error_message: null,
					created_at: '2026-01-13T12:00:00.000Z',
					updated_at: '2026-01-13T12:00:00.000Z'
				},
				{
					id: 'reminder-2',
					event_id: 'event-2',
					user_id: 'user-2',
					reminder_type: 'two_days' as const,
					scheduled_for: '2026-01-20T09:00:00.000Z',
					status: 'scheduled' as const,
					sent_at: null,
					error_message: null,
					created_at: '2026-01-13T12:00:00.000Z',
					updated_at: '2026-01-13T12:00:00.000Z'
				}
			];

			// Only return event-1, not event-2
			const mockEvents = [
				{
					id: 'event-1',
					title: 'Test Event',
					description: 'Test description',
					start_time: '2026-01-27T18:00:00.000Z',
					end_time: null,
					event_type: 'in_person' as const,
					visibility: 'public' as const,
					venue_name: 'Test Venue',
					venue_address: '123 Test St',
					venue_lat: null,
					venue_lng: null,
					video_link: null,
					capacity: null,
					format_tags: [],
					accessibility_tags: [],
					creator_id: 'creator-1',
					group_id: null,
					created_at: '2026-01-13T12:00:00.000Z',
					updated_at: '2026-01-13T12:00:00.000Z'
				}
			];

			const mockUsers = [
				{
					id: 'user-1',
					display_name: 'Test User',
					bio: null,
					profile_photo_url: null,
					location: null,
					profile_visibility: 'members_only' as const,
					created_at: '2026-01-01T00:00:00.000Z',
					updated_at: '2026-01-01T00:00:00.000Z'
				}
			];

			const mockFrom = vi.fn().mockReturnValue({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						lte: vi.fn().mockReturnValue({
							order: vi.fn().mockReturnValue({
								limit: vi.fn().mockResolvedValue({ data: mockReminders, error: null })
							})
						})
					})
				})
			});

			vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
				if (table === 'event_reminders') {
					return mockFrom() as any;
				} else if (table === 'events') {
					return {
						select: vi.fn().mockReturnValue({
							in: vi.fn().mockResolvedValue({ data: mockEvents, error: null })
						})
					} as any;
				} else if (table === 'users') {
					return {
						select: vi.fn().mockReturnValue({
							in: vi.fn().mockResolvedValue({ data: mockUsers, error: null })
						})
					} as any;
				}
				return {} as any;
			});

			const result = await fetchDueReminders();

			// Should only return reminder-1 since reminder-2 has missing event
			expect(result).toHaveLength(1);
			expect(result[0].reminder.id).toBe('reminder-1');
		});
	});

	describe('sendReminderEmail', () => {
		const mockReminder: Tables<'event_reminders'> = {
			id: 'reminder-1',
			event_id: 'event-1',
			user_id: 'user-1',
			reminder_type: 'seven_days',
			scheduled_for: '2026-01-20T09:00:00.000Z',
			status: 'scheduled',
			sent_at: null,
			error_message: null,
			created_at: '2026-01-13T12:00:00.000Z',
			updated_at: '2026-01-13T12:00:00.000Z'
		};

		const mockEvent: Tables<'events'> = {
			id: 'event-1',
			title: 'Test Event',
			description: 'Test description',
			start_time: '2026-01-27T18:00:00.000Z',
			end_time: null,
			event_type: 'in_person',
			visibility: 'public',
			venue_name: 'Test Venue',
			venue_address: '123 Test St',
			venue_lat: null,
			venue_lng: null,
			video_link: null,
			capacity: null,
			format_tags: [],
			accessibility_tags: [],
			creator_id: 'creator-1',
			group_id: null,
			created_at: '2026-01-13T12:00:00.000Z',
			updated_at: '2026-01-13T12:00:00.000Z'
		};

		const mockUser: Tables<'users'> = {
			id: 'user-1',
			display_name: 'Test User',
			bio: null,
			profile_photo_url: null,
			location: null,
			profile_visibility: 'members_only',
			created_at: '2026-01-01T00:00:00.000Z',
			updated_at: '2026-01-01T00:00:00.000Z'
		};

		it('should successfully send reminder email', async () => {
			const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

			const result = await sendReminderEmail(mockReminder, mockEvent, mockUser);

			expect(result.success).toBe(true);
			expect(result.error).toBeUndefined();
			expect(consoleSpy).toHaveBeenCalledWith(
				'Would send reminder email:',
				expect.objectContaining({
					to: 'user-1',
					subject: expect.stringContaining('Test Event')
				})
			);

			consoleSpy.mockRestore();
		});
	});

	describe('markReminderSent', () => {
		it('should mark reminder as sent', async () => {
			const mockUpdate = vi.fn().mockReturnValue({
				eq: vi.fn().mockResolvedValue({ error: null })
			});

			vi.mocked(supabaseAdmin.from).mockReturnValue({
				update: mockUpdate
			} as any);

			await markReminderSent('reminder-1');

			expect(mockUpdate).toHaveBeenCalledWith({
				status: 'sent',
				sent_at: expect.any(String)
			});
		});

		it('should throw error on database failure', async () => {
			const mockUpdate = vi.fn().mockReturnValue({
				eq: vi.fn().mockResolvedValue({ error: { message: 'Database error' } })
			});

			vi.mocked(supabaseAdmin.from).mockReturnValue({
				update: mockUpdate
			} as any);

			await expect(markReminderSent('reminder-1')).rejects.toThrow(
				'Failed to mark reminder as sent'
			);
		});
	});

	describe('markReminderFailed', () => {
		it('should mark reminder as failed with error message', async () => {
			const mockUpdate = vi.fn().mockReturnValue({
				eq: vi.fn().mockResolvedValue({ error: null })
			});

			vi.mocked(supabaseAdmin.from).mockReturnValue({
				update: mockUpdate
			} as any);

			await markReminderFailed('reminder-1', 'Email delivery failed');

			expect(mockUpdate).toHaveBeenCalledWith({
				status: 'failed',
				error_message: 'Email delivery failed'
			});
		});

		it('should throw error on database failure', async () => {
			const mockUpdate = vi.fn().mockReturnValue({
				eq: vi.fn().mockResolvedValue({ error: { message: 'Database error' } })
			});

			vi.mocked(supabaseAdmin.from).mockReturnValue({
				update: mockUpdate
			} as any);

			await expect(markReminderFailed('reminder-1', 'Email failed')).rejects.toThrow(
				'Failed to mark reminder as failed'
			);
		});
	});

	describe('cancelRemindersForRsvp', () => {
		it('should cancel all scheduled reminders for an RSVP', async () => {
			const mockUpdate = vi.fn().mockReturnValue({
				eq: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						eq: vi.fn().mockResolvedValue({ error: null })
					})
				})
			});

			vi.mocked(supabaseAdmin.from).mockReturnValue({
				update: mockUpdate
			} as any);

			await cancelRemindersForRsvp('event-1', 'user-1');

			expect(mockUpdate).toHaveBeenCalledWith({ status: 'cancelled' });
		});

		it('should throw error on database failure', async () => {
			const mockUpdate = vi.fn().mockReturnValue({
				eq: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						eq: vi.fn().mockResolvedValue({ error: { message: 'Database error' } })
					})
				})
			});

			vi.mocked(supabaseAdmin.from).mockReturnValue({
				update: mockUpdate
			} as any);

			await expect(cancelRemindersForRsvp('event-1', 'user-1')).rejects.toThrow(
				'Failed to cancel reminders'
			);
		});
	});

	describe('processScheduledReminders', () => {
		it('should process all due reminders successfully', async () => {
			// Mock fetchDueReminders to return one reminder
			const mockDueReminders = [
				{
					reminder: {
						id: 'reminder-1',
						event_id: 'event-1',
						user_id: 'user-1',
						reminder_type: 'seven_days' as const,
						scheduled_for: '2026-01-20T09:00:00.000Z',
						status: 'scheduled' as const,
						sent_at: null,
						error_message: null,
						created_at: '2026-01-13T12:00:00.000Z',
						updated_at: '2026-01-13T12:00:00.000Z'
					},
					event: {
						id: 'event-1',
						title: 'Test Event',
						description: 'Test description',
						start_time: '2026-01-27T18:00:00.000Z',
						end_time: null,
						event_type: 'in_person' as const,
						visibility: 'public' as const,
						venue_name: 'Test Venue',
						venue_address: '123 Test St',
						venue_lat: null,
						venue_lng: null,
						video_link: null,
						capacity: null,
						format_tags: [],
						accessibility_tags: [],
						creator_id: 'creator-1',
						group_id: null,
						created_at: '2026-01-13T12:00:00.000Z',
						updated_at: '2026-01-13T12:00:00.000Z'
					},
					user: {
						id: 'user-1',
						display_name: 'Test User',
						bio: null,
						profile_photo_url: null,
						location: null,
						profile_visibility: 'members_only' as const,
						created_at: '2026-01-01T00:00:00.000Z',
						updated_at: '2026-01-01T00:00:00.000Z'
					}
				}
			];

			// Mock all the database operations
			vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
				if (table === 'event_reminders') {
					return {
						select: vi.fn().mockReturnValue({
							eq: vi.fn().mockReturnValue({
								lte: vi.fn().mockReturnValue({
									order: vi.fn().mockReturnValue({
										limit: vi.fn().mockResolvedValue({
											data: [mockDueReminders[0].reminder],
											error: null
										})
									})
								})
							})
						}),
						update: vi.fn().mockReturnValue({
							eq: vi.fn().mockResolvedValue({ error: null })
						})
					} as any;
				} else if (table === 'events') {
					return {
						select: vi.fn().mockReturnValue({
							in: vi.fn().mockResolvedValue({ data: [mockDueReminders[0].event], error: null })
						})
					} as any;
				} else if (table === 'users') {
					return {
						select: vi.fn().mockReturnValue({
							in: vi.fn().mockResolvedValue({ data: [mockDueReminders[0].user], error: null })
						})
					} as any;
				}
				return {} as any;
			});

			const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

			const result = await processScheduledReminders();

			expect(result.processed).toBe(1);
			expect(result.sent).toBe(1);
			expect(result.failed).toBe(0);

			consoleSpy.mockRestore();
		});

		it('should return zero counts when no reminders are due', async () => {
			vi.mocked(supabaseAdmin.from).mockReturnValue({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						lte: vi.fn().mockReturnValue({
							order: vi.fn().mockReturnValue({
								limit: vi.fn().mockResolvedValue({ data: [], error: null })
							})
						})
					})
				})
			} as any);

			const result = await processScheduledReminders();

			expect(result.processed).toBe(0);
			expect(result.sent).toBe(0);
			expect(result.failed).toBe(0);
		});

		it('should throw error when fetching reminders fails', async () => {
			vi.mocked(supabaseAdmin.from).mockReturnValue({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						lte: vi.fn().mockReturnValue({
							order: vi.fn().mockReturnValue({
								limit: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } })
							})
						})
					})
				})
			} as any);

			const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			await expect(processScheduledReminders()).rejects.toThrow();

			consoleErrorSpy.mockRestore();
		});
	});
});
