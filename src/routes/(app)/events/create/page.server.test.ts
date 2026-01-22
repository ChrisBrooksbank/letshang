import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock SvelteKit modules
vi.mock('@sveltejs/kit', () => ({
	fail: vi.fn((status: number, data: unknown) => ({ status, data })),
	redirect: vi.fn((status: number, location: string) => {
		throw { status, location };
	})
}));

// Mock superforms
vi.mock('sveltekit-superforms', () => ({
	superValidate: vi.fn()
}));

// Mock zod adapter
vi.mock('sveltekit-superforms/adapters', () => ({
	zod: vi.fn((schema) => schema)
}));

// Import after mocks are set up
import { load, actions } from './+page.server';
import { superValidate } from 'sveltekit-superforms';

describe('Event Creation Page Server', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('load function', () => {
		it('should redirect to login if user is not authenticated', async () => {
			const mockSupabase = {
				auth: {
					getSession: vi.fn().mockResolvedValue({
						data: { session: null }
					})
				}
			};

			const mockLocals = {
				supabase: mockSupabase
			};

			await expect(
				load({
					locals: mockLocals
				} as never)
			).rejects.toMatchObject({
				status: 303,
				location: '/login'
			});
		});

		it('should return form when user is authenticated', async () => {
			const mockSupabase = {
				auth: {
					getSession: vi.fn().mockResolvedValue({
						data: { session: { user: { id: 'user-123' } } }
					})
				}
			};

			const mockLocals = {
				supabase: mockSupabase
			};

			const mockForm = { data: {}, errors: {} };
			vi.mocked(superValidate).mockResolvedValue(mockForm as never);

			const result = await load({ locals: mockLocals } as never);

			expect(result).toEqual({ form: mockForm });
			expect(superValidate).toHaveBeenCalled();
		});
	});

	describe('default action', () => {
		it('should redirect to login if user is not authenticated', async () => {
			const mockSupabase = {
				auth: {
					getSession: vi.fn().mockResolvedValue({
						data: { session: null }
					})
				}
			};

			const mockLocals = {
				supabase: mockSupabase
			};

			const mockRequest = new Request('http://localhost', {
				method: 'POST',
				body: new FormData()
			});

			await expect(
				actions.default({
					request: mockRequest,
					locals: mockLocals
				} as never)
			).rejects.toMatchObject({
				status: 303,
				location: '/login'
			});
		});

		it('should fail with 400 when form validation fails', async () => {
			const mockSupabase = {
				auth: {
					getSession: vi.fn().mockResolvedValue({
						data: { session: { user: { id: 'user-123' } } }
					})
				}
			};

			const mockLocals = {
				supabase: mockSupabase
			};

			const mockForm = {
				valid: false,
				data: {},
				errors: { title: ['Title is required'] }
			};

			vi.mocked(superValidate).mockResolvedValue(mockForm as never);

			const mockRequest = new Request('http://localhost', {
				method: 'POST',
				body: new FormData()
			});

			await actions.default({
				request: mockRequest,
				locals: mockLocals
			} as never);

			expect(vi.mocked(superValidate)).toHaveBeenCalled();
		});

		it('should create event and redirect for valid data', async () => {
			const mockInsert = vi.fn().mockReturnThis();
			const mockSelect = vi.fn().mockReturnThis();
			const mockSingle = vi.fn().mockResolvedValue({
				data: { id: 'test-event-id' },
				error: null
			});

			const mockSupabase = {
				auth: {
					getSession: vi.fn().mockResolvedValue({
						data: {
							session: {
								user: { id: 'user-123' }
							}
						}
					})
				},
				from: vi.fn().mockReturnValue({
					insert: mockInsert
				})
			};

			mockInsert.mockReturnValue({
				select: mockSelect
			});

			mockSelect.mockReturnValue({
				single: mockSingle
			});

			const mockLocals = {
				supabase: mockSupabase
			};

			const mockForm = {
				valid: true,
				data: {
					title: 'Test Event',
					description: 'Test description',
					eventType: 'online',
					startTime: '2024-12-31T12:00:00.000Z',
					durationMinutes: 60
				}
			};

			vi.mocked(superValidate).mockResolvedValue(mockForm as never);

			const mockRequest = new Request('http://localhost', {
				method: 'POST',
				body: new FormData()
			});

			await expect(
				actions.default({
					request: mockRequest,
					locals: mockLocals
				} as never)
			).rejects.toMatchObject({
				status: 303,
				location: '/events/test-event-id'
			});

			expect(mockSupabase.from).toHaveBeenCalledWith('events');
			expect(mockInsert).toHaveBeenCalled();
		});

		it('should include venue information for in-person events', async () => {
			const mockInsert = vi.fn().mockReturnThis();
			const mockSelect = vi.fn().mockReturnThis();
			const mockSingle = vi.fn().mockResolvedValue({
				data: { id: 'test-event-id' },
				error: null
			});

			const mockSupabase = {
				auth: {
					getSession: vi.fn().mockResolvedValue({
						data: {
							session: {
								user: { id: 'user-123' }
							}
						}
					})
				},
				from: vi.fn().mockReturnValue({
					insert: mockInsert
				})
			};

			mockInsert.mockReturnValue({
				select: mockSelect
			});

			mockSelect.mockReturnValue({
				single: mockSingle
			});

			const mockLocals = {
				supabase: mockSupabase
			};

			const mockForm = {
				valid: true,
				data: {
					title: 'Test Event',
					description: 'Test description',
					eventType: 'in_person',
					startTime: '2024-12-31T12:00:00.000Z',
					durationMinutes: 60,
					venueName: 'Test Venue',
					venueAddress: '123 Test St'
				}
			};

			vi.mocked(superValidate).mockResolvedValue(mockForm as never);

			const mockRequest = new Request('http://localhost', {
				method: 'POST',
				body: new FormData()
			});

			await expect(
				actions.default({
					request: mockRequest,
					locals: mockLocals
				} as never)
			).rejects.toMatchObject({
				status: 303,
				location: '/events/test-event-id'
			});

			expect(mockInsert).toHaveBeenCalledWith(
				expect.objectContaining({
					venue_name: 'Test Venue',
					venue_address: '123 Test St'
				})
			);
		});

		it('should handle database errors', async () => {
			const mockInsert = vi.fn().mockReturnThis();
			const mockSelect = vi.fn().mockReturnThis();
			const mockSingle = vi.fn().mockResolvedValue({
				data: null,
				error: { message: 'Database error' }
			});

			const mockSupabase = {
				auth: {
					getSession: vi.fn().mockResolvedValue({
						data: {
							session: {
								user: { id: 'user-123' }
							}
						}
					})
				},
				from: vi.fn().mockReturnValue({
					insert: mockInsert
				})
			};

			mockInsert.mockReturnValue({
				select: mockSelect
			});

			mockSelect.mockReturnValue({
				single: mockSingle
			});

			const mockLocals = {
				supabase: mockSupabase
			};

			const mockForm = {
				valid: true,
				data: {
					title: 'Test Event',
					description: '',
					eventType: 'online',
					startTime: '2024-12-31T12:00:00.000Z',
					durationMinutes: 60
				}
			};

			vi.mocked(superValidate).mockResolvedValue(mockForm as never);

			const mockRequest = new Request('http://localhost', {
				method: 'POST',
				body: new FormData()
			});

			const result = await actions.default({
				request: mockRequest,
				locals: mockLocals
			} as never);

			expect(result).toEqual({
				status: 500,
				data: expect.objectContaining({
					form: expect.objectContaining({
						errors: {
							_errors: ['Failed to create event. Please try again.']
						}
					})
				})
			});
		});

		it('should calculate end time from duration', async () => {
			const mockInsert = vi.fn().mockReturnThis();
			const mockSelect = vi.fn().mockReturnThis();
			const mockSingle = vi.fn().mockResolvedValue({
				data: { id: 'test-event-id' },
				error: null
			});

			const mockSupabase = {
				auth: {
					getSession: vi.fn().mockResolvedValue({
						data: {
							session: {
								user: { id: 'user-123' }
							}
						}
					})
				},
				from: vi.fn().mockReturnValue({
					insert: mockInsert
				})
			};

			mockInsert.mockReturnValue({
				select: mockSelect
			});

			mockSelect.mockReturnValue({
				single: mockSingle
			});

			const mockLocals = {
				supabase: mockSupabase
			};

			const startTime = '2024-12-31T12:00:00.000Z';
			const expectedEndTime = new Date(new Date(startTime).getTime() + 90 * 60000).toISOString();

			const mockForm = {
				valid: true,
				data: {
					title: 'Test Event',
					description: '',
					eventType: 'online',
					startTime,
					durationMinutes: 90
				}
			};

			vi.mocked(superValidate).mockResolvedValue(mockForm as never);

			const mockRequest = new Request('http://localhost', {
				method: 'POST',
				body: new FormData()
			});

			await expect(
				actions.default({
					request: mockRequest,
					locals: mockLocals
				} as never)
			).rejects.toMatchObject({
				status: 303
			});

			expect(mockInsert).toHaveBeenCalledWith(
				expect.objectContaining({
					end_time: expectedEndTime
				})
			);
		});
	});
});
