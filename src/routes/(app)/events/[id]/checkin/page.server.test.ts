import { describe, it, expect, vi, beforeEach } from 'vitest';
import { load, actions } from './+page.server';
import { supabase } from '$lib/server/supabase';

// Mock the Supabase client
vi.mock('$lib/server/supabase', () => ({
	supabase: {
		from: vi.fn()
	}
}));

const mockSupabase = supabase as any;

describe('Event Check-in Page Server', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('load function', () => {
		it('should redirect to login if user is not authenticated', async () => {
			const mockLocals = {
				session: null
			};

			const mockParams = { id: 'event-123' };

			await expect(
				load({
					params: mockParams,
					locals: mockLocals
				} as unknown as Parameters<typeof load>[0])
			).rejects.toThrow();
		});

		it('should return 404 if event not found', async () => {
			const mockLocals = {
				session: { user: { id: 'user-123' } }
			};

			const mockParams = { id: 'event-123' };

			mockSupabase.from.mockReturnValue({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						single: vi.fn().mockResolvedValue({
							data: null,
							error: { message: 'Event not found' }
						})
					})
				})
			});

			await expect(
				load({
					params: mockParams,
					locals: mockLocals
				} as unknown as Parameters<typeof load>[0])
			).rejects.toThrow();
		});

		it('should return 403 if user is not event creator', async () => {
			const mockLocals = {
				session: { user: { id: 'user-123' } }
			};

			const mockParams = { id: 'event-123' };

			const mockEvent = {
				id: 'event-123',
				title: 'Test Event',
				creator_id: 'different-user',
				start_time: new Date(Date.now() + 1000 * 60 * 60).toISOString()
			};

			mockSupabase.from.mockReturnValue({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						single: vi.fn().mockResolvedValue({
							data: mockEvent,
							error: null
						})
					})
				})
			});

			await expect(
				load({
					params: mockParams,
					locals: mockLocals
				} as unknown as Parameters<typeof load>[0])
			).rejects.toThrow();
		});

		it('should load event and attendees for event creator', async () => {
			const mockLocals = {
				session: { user: { id: 'user-123' } }
			};

			const mockParams = { id: 'event-123' };

			const futureTime = new Date(Date.now() + 1000 * 60 * 60).toISOString();
			const mockEvent = {
				id: 'event-123',
				title: 'Test Event',
				creator_id: 'user-123',
				start_time: futureTime
			};

			const mockAttendees = [
				{
					id: 'rsvp-1',
					user_id: 'attendee-1',
					checked_in_at: null,
					created_at: new Date().toISOString(),
					users: {
						id: 'attendee-1',
						email: 'attendee1@example.com',
						display_name: 'Attendee One',
						profile_photo_url: null
					}
				},
				{
					id: 'rsvp-2',
					user_id: 'attendee-2',
					checked_in_at: new Date().toISOString(),
					created_at: new Date().toISOString(),
					users: {
						id: 'attendee-2',
						email: 'attendee2@example.com',
						display_name: 'Attendee Two',
						profile_photo_url: null
					}
				}
			];

			let callCount = 0;
			mockSupabase.from.mockImplementation(() => {
				callCount++;
				if (callCount === 1) {
					// First call: fetch event
					return {
						select: vi.fn().mockReturnValue({
							eq: vi.fn().mockReturnValue({
								single: vi.fn().mockResolvedValue({
									data: mockEvent,
									error: null
								})
							})
						})
					};
				} else {
					// Second call: fetch attendees
					const mockOrderChain = {
						order: vi.fn().mockResolvedValue({
							data: mockAttendees,
							error: null
						})
					};
					return {
						select: vi.fn().mockReturnValue({
							eq: vi.fn().mockReturnThis(),
							order: vi.fn().mockReturnValue(mockOrderChain)
						})
					};
				}
			});

			const result = await load({
				params: mockParams,
				locals: mockLocals
			} as unknown as Parameters<typeof load>[0]);

			const typedResult = result as any;
			expect(typedResult.event).toEqual(mockEvent);
			expect(typedResult.attendees).toEqual(mockAttendees);
			expect(typedResult.stats.totalGoing).toBe(2);
			expect(typedResult.stats.checkedInCount).toBe(1);
			expect(typedResult.stats.notCheckedInCount).toBe(1);
		});

		it('should indicate check-in is not available if event is more than 1 hour away', async () => {
			const mockLocals = {
				session: { user: { id: 'user-123' } }
			};

			const mockParams = { id: 'event-123' };

			// Event is 2 hours away
			const futureTime = new Date(Date.now() + 1000 * 60 * 60 * 2).toISOString();
			const mockEvent = {
				id: 'event-123',
				title: 'Test Event',
				creator_id: 'user-123',
				start_time: futureTime
			};

			let callCount = 0;
			mockSupabase.from.mockImplementation(() => {
				callCount++;
				if (callCount === 1) {
					return {
						select: vi.fn().mockReturnValue({
							eq: vi.fn().mockReturnValue({
								single: vi.fn().mockResolvedValue({
									data: mockEvent,
									error: null
								})
							})
						})
					};
				} else {
					const mockOrderChain = {
						order: vi.fn().mockResolvedValue({
							data: [],
							error: null
						})
					};
					return {
						select: vi.fn().mockReturnValue({
							eq: vi.fn().mockReturnThis(),
							order: vi.fn().mockReturnValue(mockOrderChain)
						})
					};
				}
			});

			const result = await load({
				params: mockParams,
				locals: mockLocals
			} as unknown as Parameters<typeof load>[0]);

			expect((result as any).checkInAvailable).toBe(false);
		});

		it('should indicate check-in is available if event is within 1 hour', async () => {
			const mockLocals = {
				session: { user: { id: 'user-123' } }
			};

			const mockParams = { id: 'event-123' };

			// Event is 30 minutes away
			const futureTime = new Date(Date.now() + 1000 * 60 * 30).toISOString();
			const mockEvent = {
				id: 'event-123',
				title: 'Test Event',
				creator_id: 'user-123',
				start_time: futureTime
			};

			let callCount = 0;
			mockSupabase.from.mockImplementation(() => {
				callCount++;
				if (callCount === 1) {
					return {
						select: vi.fn().mockReturnValue({
							eq: vi.fn().mockReturnValue({
								single: vi.fn().mockResolvedValue({
									data: mockEvent,
									error: null
								})
							})
						})
					};
				} else {
					const mockOrderChain = {
						order: vi.fn().mockResolvedValue({
							data: [],
							error: null
						})
					};
					return {
						select: vi.fn().mockReturnValue({
							eq: vi.fn().mockReturnThis(),
							order: vi.fn().mockReturnValue(mockOrderChain)
						})
					};
				}
			});

			const result = await load({
				params: mockParams,
				locals: mockLocals
			} as unknown as Parameters<typeof load>[0]);

			expect((result as any).checkInAvailable).toBe(true);
		});

		it('should handle database errors when fetching attendees', async () => {
			const mockLocals = {
				session: { user: { id: 'user-123' } }
			};

			const mockParams = { id: 'event-123' };

			const mockEvent = {
				id: 'event-123',
				title: 'Test Event',
				creator_id: 'user-123',
				start_time: new Date().toISOString()
			};

			let callCount = 0;
			mockSupabase.from.mockImplementation(() => {
				callCount++;
				if (callCount === 1) {
					return {
						select: vi.fn().mockReturnValue({
							eq: vi.fn().mockReturnValue({
								single: vi.fn().mockResolvedValue({
									data: mockEvent,
									error: null
								})
							})
						})
					};
				} else {
					return {
						select: vi.fn().mockReturnValue({
							eq: vi.fn().mockReturnThis(),
							order: vi.fn().mockResolvedValue({
								data: null,
								error: { message: 'Database error' }
							})
						})
					};
				}
			});

			await expect(
				load({
					params: mockParams,
					locals: mockLocals
				} as unknown as Parameters<typeof load>[0])
			).rejects.toThrow();
		});
	});

	describe('actions.checkIn', () => {
		it('should return 401 if user is not authenticated', async () => {
			const mockRequest = new Request('http://localhost', {
				method: 'POST',
				body: new URLSearchParams({ rsvp_id: 'rsvp-123' })
			});

			const result = await actions.checkIn({
				request: mockRequest,
				locals: { session: null },
				params: { id: 'event-123' }
			} as any);

			expect((result as any).data).toEqual({ error: 'Unauthorized' });
		});

		it('should return 400 if rsvp_id is missing', async () => {
			const mockRequest = new Request('http://localhost', {
				method: 'POST',
				body: new URLSearchParams({})
			});

			const result = await actions.checkIn({
				request: mockRequest,
				locals: { session: { user: { id: 'user-123' } } },
				params: { id: 'event-123' }
			} as any);

			expect((result as any).data).toEqual({ error: 'RSVP ID is required' });
		});

		it('should return 404 if event not found', async () => {
			const mockRequest = new Request('http://localhost', {
				method: 'POST',
				body: new URLSearchParams({ rsvp_id: 'rsvp-123' })
			});

			mockSupabase.from.mockReturnValue({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						single: vi.fn().mockResolvedValue({
							data: null,
							error: { message: 'Event not found' }
						})
					})
				})
			});

			const result = await actions.checkIn({
				request: mockRequest,
				locals: { session: { user: { id: 'user-123' } } },
				params: { id: 'event-123' }
			} as any);

			expect((result as any).data).toEqual({ error: 'Event not found' });
		});

		it('should return 403 if user is not event creator', async () => {
			const mockRequest = new Request('http://localhost', {
				method: 'POST',
				body: new URLSearchParams({ rsvp_id: 'rsvp-123' })
			});

			const mockEvent = {
				creator_id: 'different-user',
				start_time: new Date(Date.now() + 1000 * 60 * 30).toISOString()
			};

			mockSupabase.from.mockReturnValue({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						single: vi.fn().mockResolvedValue({
							data: mockEvent,
							error: null
						})
					})
				})
			});

			const result = await actions.checkIn({
				request: mockRequest,
				locals: { session: { user: { id: 'user-123' } } },
				params: { id: 'event-123' }
			} as any);

			expect((result as any).data).toEqual({ error: 'Only event hosts can check in attendees' });
		});

		it('should return 400 if check-in window not open yet', async () => {
			const mockRequest = new Request('http://localhost', {
				method: 'POST',
				body: new URLSearchParams({ rsvp_id: 'rsvp-123' })
			});

			// Event is 2 hours away
			const mockEvent = {
				creator_id: 'user-123',
				start_time: new Date(Date.now() + 1000 * 60 * 60 * 2).toISOString()
			};

			mockSupabase.from.mockReturnValue({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						single: vi.fn().mockResolvedValue({
							data: mockEvent,
							error: null
						})
					})
				})
			});

			const result = await actions.checkIn({
				request: mockRequest,
				locals: { session: { user: { id: 'user-123' } } },
				params: { id: 'event-123' }
			} as any);

			expect((result as any).data).toEqual({ error: 'Check-in opens 1 hour before the event' });
		});

		it('should successfully check in an attendee', async () => {
			const mockRequest = new Request('http://localhost', {
				method: 'POST',
				body: new URLSearchParams({ rsvp_id: 'rsvp-123' })
			});

			const mockEvent = {
				creator_id: 'user-123',
				start_time: new Date(Date.now() + 1000 * 60 * 30).toISOString()
			};

			let callCount = 0;
			mockSupabase.from.mockImplementation(() => {
				callCount++;
				if (callCount === 1) {
					// First call: fetch event
					return {
						select: vi.fn().mockReturnValue({
							eq: vi.fn().mockReturnValue({
								single: vi.fn().mockResolvedValue({
									data: mockEvent,
									error: null
								})
							})
						})
					};
				} else {
					// Second call: update RSVP
					return {
						update: vi.fn().mockReturnValue({
							eq: vi.fn().mockReturnThis(),
							error: null
						})
					};
				}
			});

			const result = await actions.checkIn({
				request: mockRequest,
				locals: { session: { user: { id: 'user-123' } } },
				params: { id: 'event-123' }
			} as any);

			expect(result).toEqual({ success: true });
		});

		it('should handle database errors during check-in', async () => {
			const mockRequest = new Request('http://localhost', {
				method: 'POST',
				body: new URLSearchParams({ rsvp_id: 'rsvp-123' })
			});

			const mockEvent = {
				creator_id: 'user-123',
				start_time: new Date(Date.now() + 1000 * 60 * 30).toISOString()
			};

			let callCount = 0;
			mockSupabase.from.mockImplementation(() => {
				callCount++;
				if (callCount === 1) {
					return {
						select: vi.fn().mockReturnValue({
							eq: vi.fn().mockReturnValue({
								single: vi.fn().mockResolvedValue({
									data: mockEvent,
									error: null
								})
							})
						})
					};
				} else {
					return {
						update: vi.fn().mockReturnValue({
							eq: vi.fn().mockReturnThis(),
							error: { message: 'Database error' }
						})
					};
				}
			});

			const result = await actions.checkIn({
				request: mockRequest,
				locals: { session: { user: { id: 'user-123' } } },
				params: { id: 'event-123' }
			} as any);

			expect((result as any).data).toEqual({ error: 'Failed to check in attendee' });
		});
	});

	describe('actions.uncheckIn', () => {
		it('should return 401 if user is not authenticated', async () => {
			const mockRequest = new Request('http://localhost', {
				method: 'POST',
				body: new URLSearchParams({ rsvp_id: 'rsvp-123' })
			});

			const result = await actions.uncheckIn({
				request: mockRequest,
				locals: { session: null },
				params: { id: 'event-123' }
			} as any);

			expect((result as any).data).toEqual({ error: 'Unauthorized' });
		});

		it('should return 400 if rsvp_id is missing', async () => {
			const mockRequest = new Request('http://localhost', {
				method: 'POST',
				body: new URLSearchParams({})
			});

			const result = await actions.uncheckIn({
				request: mockRequest,
				locals: { session: { user: { id: 'user-123' } } },
				params: { id: 'event-123' }
			} as any);

			expect((result as any).data).toEqual({ error: 'RSVP ID is required' });
		});

		it('should return 403 if user is not event creator', async () => {
			const mockRequest = new Request('http://localhost', {
				method: 'POST',
				body: new URLSearchParams({ rsvp_id: 'rsvp-123' })
			});

			const mockEvent = {
				creator_id: 'different-user'
			};

			mockSupabase.from.mockReturnValue({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						single: vi.fn().mockResolvedValue({
							data: mockEvent,
							error: null
						})
					})
				})
			});

			const result = await actions.uncheckIn({
				request: mockRequest,
				locals: { session: { user: { id: 'user-123' } } },
				params: { id: 'event-123' }
			} as any);

			expect((result as any).data).toEqual({ error: 'Only event hosts can uncheck attendees' });
		});

		it('should successfully uncheck an attendee', async () => {
			const mockRequest = new Request('http://localhost', {
				method: 'POST',
				body: new URLSearchParams({ rsvp_id: 'rsvp-123' })
			});

			const mockEvent = {
				creator_id: 'user-123'
			};

			let callCount = 0;
			mockSupabase.from.mockImplementation(() => {
				callCount++;
				if (callCount === 1) {
					return {
						select: vi.fn().mockReturnValue({
							eq: vi.fn().mockReturnValue({
								single: vi.fn().mockResolvedValue({
									data: mockEvent,
									error: null
								})
							})
						})
					};
				} else {
					return {
						update: vi.fn().mockReturnValue({
							eq: vi.fn().mockReturnThis(),
							error: null
						})
					};
				}
			});

			const result = await actions.uncheckIn({
				request: mockRequest,
				locals: { session: { user: { id: 'user-123' } } },
				params: { id: 'event-123' }
			} as any);

			expect(result).toEqual({ success: true });
		});

		it('should handle database errors during uncheck', async () => {
			const mockRequest = new Request('http://localhost', {
				method: 'POST',
				body: new URLSearchParams({ rsvp_id: 'rsvp-123' })
			});

			const mockEvent = {
				creator_id: 'user-123'
			};

			let callCount = 0;
			mockSupabase.from.mockImplementation(() => {
				callCount++;
				if (callCount === 1) {
					return {
						select: vi.fn().mockReturnValue({
							eq: vi.fn().mockReturnValue({
								single: vi.fn().mockResolvedValue({
									data: mockEvent,
									error: null
								})
							})
						})
					};
				} else {
					return {
						update: vi.fn().mockReturnValue({
							eq: vi.fn().mockReturnThis(),
							error: { message: 'Database error' }
						})
					};
				}
			});

			const result = await actions.uncheckIn({
				request: mockRequest,
				locals: { session: { user: { id: 'user-123' } } },
				params: { id: 'event-123' }
			} as any);

			expect((result as any).data).toEqual({ error: 'Failed to uncheck attendee' });
		});
	});
});
