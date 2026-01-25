import { describe, it, expect, vi, beforeEach } from 'vitest';
import { load, actions } from './+page.server';
import { supabase } from '$lib/server/supabase';

vi.mock('$lib/server/supabase', () => ({
	supabase: {
		from: vi.fn()
	}
}));

describe('Event Detail Page Server', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('load', () => {
		it('should load event details with RSVP status', async () => {
			const mockEvent = {
				id: 'event-123',
				title: 'Test Event',
				description: 'Test Description',
				event_type: 'in_person',
				start_time: '2026-02-01T19:00:00Z',
				creator_id: 'creator-123'
			};

			const mockRsvp = {
				id: 'rsvp-123',
				event_id: 'event-123',
				user_id: 'user-123',
				status: 'going'
			};

			const mockRsvpCounts = [
				{ status: 'going' },
				{ status: 'going' },
				{ status: 'interested' },
				{ status: 'not_going' }
			];

			const mockFrom = vi.fn();

			// Mock event query
			mockFrom.mockReturnValueOnce({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						single: vi.fn().mockResolvedValue({
							data: mockEvent,
							error: null
						})
					})
				})
			});

			// Mock user RSVP query
			mockFrom.mockReturnValueOnce({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							single: vi.fn().mockResolvedValue({
								data: mockRsvp,
								error: null
							})
						})
					})
				})
			});

			// Mock RSVP counts query
			mockFrom.mockReturnValueOnce({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockResolvedValue({
						data: mockRsvpCounts,
						error: null
					})
				})
			});

			(supabase.from as ReturnType<typeof vi.fn>).mockImplementation(mockFrom);

			const result = await load({
				params: { id: 'event-123' },
				locals: {
					session: {
						user: { id: 'user-123' }
					}
				}
			} as any);

			expect((result as any).event).toEqual(mockEvent);
			expect((result as any).userRsvp).toEqual(mockRsvp);
			expect((result as any).counts).toEqual({
				going: 2,
				interested: 1,
				notGoing: 1
			});
			expect((result as any).userId).toBe('user-123');
		});

		it('should handle missing RSVP', async () => {
			const mockEvent = {
				id: 'event-123',
				title: 'Test Event'
			};

			const mockFrom = vi.fn();

			// Mock event query
			mockFrom.mockReturnValueOnce({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						single: vi.fn().mockResolvedValue({
							data: mockEvent,
							error: null
						})
					})
				})
			});

			// Mock user RSVP query (no RSVP)
			mockFrom.mockReturnValueOnce({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							single: vi.fn().mockResolvedValue({
								data: null,
								error: null
							})
						})
					})
				})
			});

			// Mock RSVP counts query
			mockFrom.mockReturnValueOnce({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockResolvedValue({
						data: [],
						error: null
					})
				})
			});

			(supabase.from as ReturnType<typeof vi.fn>).mockImplementation(mockFrom);

			const result = await load({
				params: { id: 'event-123' },
				locals: {
					session: {
						user: { id: 'user-123' }
					}
				}
			} as any);

			expect((result as any).userRsvp).toBeNull();
			expect((result as any).counts).toEqual({
				going: 0,
				interested: 0,
				notGoing: 0
			});
		});

		it('should throw 404 if event not found', async () => {
			const mockFrom = vi.fn().mockReturnValue({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						single: vi.fn().mockResolvedValue({
							data: null,
							error: { message: 'Not found' }
						})
					})
				})
			});

			(supabase.from as ReturnType<typeof vi.fn>).mockImplementation(mockFrom);

			await expect(
				load({
					params: { id: 'nonexistent' },
					locals: {
						session: {
							user: { id: 'user-123' }
						}
					}
				} as any)
			).rejects.toThrow();
		});

		it('should redirect to login if not authenticated', async () => {
			await expect(
				load({
					params: { id: 'event-123' },
					locals: { session: null }
				} as any)
			).rejects.toThrow();
		});
	});

	describe('actions.rsvp', () => {
		it('should create new RSVP', async () => {
			const mockFrom = vi.fn();

			// Mock event query
			mockFrom.mockReturnValueOnce({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						single: vi.fn().mockResolvedValue({
							data: { id: 'event-123', event_type: 'in_person' },
							error: null
						})
					})
				})
			});

			// Mock existing RSVP check (none found)
			mockFrom.mockReturnValueOnce({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							single: vi.fn().mockResolvedValue({
								data: null,
								error: null
							})
						})
					})
				})
			});

			// Mock insert
			mockFrom.mockReturnValueOnce({
				insert: vi.fn().mockResolvedValue({
					error: null
				})
			});

			(supabase.from as ReturnType<typeof vi.fn>).mockImplementation(mockFrom);

			const formData = new FormData();
			formData.append('status', 'going');

			const result = await actions.rsvp({
				request: { formData: async () => formData } as any,
				locals: {
					session: {
						user: { id: 'user-123' }
					}
				},
				params: { id: 'event-123' }
			} as any);

			expect(result).toEqual({ success: true, status: 'going', attendanceMode: null });
		});

		it('should update existing RSVP', async () => {
			const mockExistingRsvp = {
				id: 'rsvp-123',
				event_id: 'event-123',
				user_id: 'user-123',
				status: 'interested'
			};

			const mockFrom = vi.fn();

			// Mock event query
			mockFrom.mockReturnValueOnce({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						single: vi.fn().mockResolvedValue({
							data: { id: 'event-123', event_type: 'in_person' },
							error: null
						})
					})
				})
			});

			// Mock existing RSVP check
			mockFrom.mockReturnValueOnce({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							single: vi.fn().mockResolvedValue({
								data: mockExistingRsvp,
								error: null
							})
						})
					})
				})
			});

			// Mock update
			mockFrom.mockReturnValueOnce({
				update: vi.fn().mockReturnValue({
					eq: vi.fn().mockResolvedValue({
						error: null
					})
				})
			});

			(supabase.from as ReturnType<typeof vi.fn>).mockImplementation(mockFrom);

			const formData = new FormData();
			formData.append('status', 'going');

			const result = await actions.rsvp({
				request: { formData: async () => formData } as any,
				locals: {
					session: {
						user: { id: 'user-123' }
					}
				},
				params: { id: 'event-123' }
			} as any);

			expect(result).toEqual({ success: true, status: 'going', attendanceMode: null });
		});

		it('should reject invalid status', async () => {
			const formData = new FormData();
			formData.append('status', 'invalid');

			const result = await actions.rsvp({
				request: { formData: async () => formData } as any,
				locals: {
					session: {
						user: { id: 'user-123' }
					}
				},
				params: { id: 'event-123' }
			} as any);

			expect(result).toHaveProperty('status', 400);
			expect(result).toHaveProperty('data.error', 'Invalid RSVP status');
		});

		it('should require authentication', async () => {
			const formData = new FormData();
			formData.append('status', 'going');

			const result = await actions.rsvp({
				request: { formData: async () => formData } as any,
				locals: { session: null },
				params: { id: 'event-123' }
			} as any);

			expect(result).toHaveProperty('status', 401);
		});

		it('should handle database errors on insert', async () => {
			const mockFrom = vi.fn();

			// Mock event query
			mockFrom.mockReturnValueOnce({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						single: vi.fn().mockResolvedValue({
							data: { id: 'event-123', event_type: 'in_person' },
							error: null
						})
					})
				})
			});

			// Mock existing RSVP check (none found)
			mockFrom.mockReturnValueOnce({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							single: vi.fn().mockResolvedValue({
								data: null,
								error: null
							})
						})
					})
				})
			});

			// Mock insert error
			mockFrom.mockReturnValueOnce({
				insert: vi.fn().mockResolvedValue({
					error: { message: 'Database error' }
				})
			});

			(supabase.from as ReturnType<typeof vi.fn>).mockImplementation(mockFrom);

			const formData = new FormData();
			formData.append('status', 'going');

			const result = await actions.rsvp({
				request: { formData: async () => formData } as any,
				locals: {
					session: {
						user: { id: 'user-123' }
					}
				},
				params: { id: 'event-123' }
			} as any);

			expect(result).toHaveProperty('status', 500);
		});
	});

	describe('actions.cancelRsvp', () => {
		it('should delete RSVP', async () => {
			const mockFrom = vi.fn().mockReturnValue({
				delete: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						eq: vi.fn().mockResolvedValue({
							error: null
						})
					})
				})
			});

			(supabase.from as ReturnType<typeof vi.fn>).mockImplementation(mockFrom);

			const result = await actions.cancelRsvp({
				locals: {
					session: {
						user: { id: 'user-123' }
					}
				},
				params: { id: 'event-123' }
			} as any);

			expect(result).toEqual({ success: true, canceled: true });
		});

		it('should require authentication', async () => {
			const result = await actions.cancelRsvp({
				locals: { session: null },
				params: { id: 'event-123' }
			} as any);

			expect(result).toHaveProperty('status', 401);
		});

		it('should handle database errors', async () => {
			const mockFrom = vi.fn().mockReturnValue({
				delete: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						eq: vi.fn().mockResolvedValue({
							error: { message: 'Database error' }
						})
					})
				})
			});

			(supabase.from as ReturnType<typeof vi.fn>).mockImplementation(mockFrom);

			const result = await actions.cancelRsvp({
				locals: {
					session: {
						user: { id: 'user-123' }
					}
				},
				params: { id: 'event-123' }
			} as any);

			expect(result).toHaveProperty('status', 500);
		});
	});

	describe('Hybrid Event Attendance Mode', () => {
		it('should require attendance_mode for hybrid events with going status', async () => {
			const mockFrom = vi.fn();

			// Mock event query (hybrid event)
			mockFrom.mockReturnValueOnce({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						single: vi.fn().mockResolvedValue({
							data: { id: 'event-123', event_type: 'hybrid' },
							error: null
						})
					})
				})
			});

			(supabase.from as ReturnType<typeof vi.fn>).mockImplementation(mockFrom);

			const formData = new FormData();
			formData.append('status', 'going');
			// No attendance_mode provided

			const result = await actions.rsvp({
				request: { formData: async () => formData } as any,
				locals: {
					session: {
						user: { id: 'user-123' }
					}
				},
				params: { id: 'event-123' }
			} as any);

			expect(result).toHaveProperty('status', 400);
			expect(result).toHaveProperty('data.error', 'Attendance mode is required for hybrid events');
		});

		it('should accept in_person attendance mode for hybrid events', async () => {
			const mockFrom = vi.fn();

			// Mock event query (hybrid event)
			mockFrom.mockReturnValueOnce({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						single: vi.fn().mockResolvedValue({
							data: { id: 'event-123', event_type: 'hybrid' },
							error: null
						})
					})
				})
			});

			// Mock existing RSVP check (none found)
			mockFrom.mockReturnValueOnce({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							single: vi.fn().mockResolvedValue({
								data: null,
								error: null
							})
						})
					})
				})
			});

			// Mock insert
			mockFrom.mockReturnValueOnce({
				insert: vi.fn().mockResolvedValue({
					error: null
				})
			});

			(supabase.from as ReturnType<typeof vi.fn>).mockImplementation(mockFrom);

			const formData = new FormData();
			formData.append('status', 'going');
			formData.append('attendance_mode', 'in_person');

			const result = await actions.rsvp({
				request: { formData: async () => formData } as any,
				locals: {
					session: {
						user: { id: 'user-123' }
					}
				},
				params: { id: 'event-123' }
			} as any);

			expect(result).toEqual({ success: true, status: 'going', attendanceMode: 'in_person' });
		});

		it('should accept online attendance mode for hybrid events', async () => {
			const mockFrom = vi.fn();

			// Mock event query (hybrid event)
			mockFrom.mockReturnValueOnce({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						single: vi.fn().mockResolvedValue({
							data: { id: 'event-123', event_type: 'hybrid' },
							error: null
						})
					})
				})
			});

			// Mock existing RSVP check (none found)
			mockFrom.mockReturnValueOnce({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							single: vi.fn().mockResolvedValue({
								data: null,
								error: null
							})
						})
					})
				})
			});

			// Mock insert
			mockFrom.mockReturnValueOnce({
				insert: vi.fn().mockResolvedValue({
					error: null
				})
			});

			(supabase.from as ReturnType<typeof vi.fn>).mockImplementation(mockFrom);

			const formData = new FormData();
			formData.append('status', 'going');
			formData.append('attendance_mode', 'online');

			const result = await actions.rsvp({
				request: { formData: async () => formData } as any,
				locals: {
					session: {
						user: { id: 'user-123' }
					}
				},
				params: { id: 'event-123' }
			} as any);

			expect(result).toEqual({ success: true, status: 'going', attendanceMode: 'online' });
		});

		it('should reject invalid attendance mode', async () => {
			const mockFrom = vi.fn();

			// Mock event query (hybrid event)
			mockFrom.mockReturnValueOnce({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						single: vi.fn().mockResolvedValue({
							data: { id: 'event-123', event_type: 'hybrid' },
							error: null
						})
					})
				})
			});

			(supabase.from as ReturnType<typeof vi.fn>).mockImplementation(mockFrom);

			const formData = new FormData();
			formData.append('status', 'going');
			formData.append('attendance_mode', 'invalid');

			const result = await actions.rsvp({
				request: { formData: async () => formData } as any,
				locals: {
					session: {
						user: { id: 'user-123' }
					}
				},
				params: { id: 'event-123' }
			} as any);

			expect(result).toHaveProperty('status', 400);
			expect(result).toHaveProperty('data.error', 'Invalid attendance mode');
		});

		it('should not require attendance_mode for non-hybrid events', async () => {
			const mockFrom = vi.fn();

			// Mock event query (in-person event)
			mockFrom.mockReturnValueOnce({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						single: vi.fn().mockResolvedValue({
							data: { id: 'event-123', event_type: 'in_person' },
							error: null
						})
					})
				})
			});

			// Mock existing RSVP check (none found)
			mockFrom.mockReturnValueOnce({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							single: vi.fn().mockResolvedValue({
								data: null,
								error: null
							})
						})
					})
				})
			});

			// Mock insert
			mockFrom.mockReturnValueOnce({
				insert: vi.fn().mockResolvedValue({
					error: null
				})
			});

			(supabase.from as ReturnType<typeof vi.fn>).mockImplementation(mockFrom);

			const formData = new FormData();
			formData.append('status', 'going');
			// No attendance_mode provided for in-person event

			const result = await actions.rsvp({
				request: { formData: async () => formData } as any,
				locals: {
					session: {
						user: { id: 'user-123' }
					}
				},
				params: { id: 'event-123' }
			} as any);

			expect(result).toEqual({ success: true, status: 'going', attendanceMode: null });
		});

		it('should set attendance_mode to null for non-hybrid events even if provided', async () => {
			const mockFrom = vi.fn();

			// Mock event query (online event)
			mockFrom.mockReturnValueOnce({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						single: vi.fn().mockResolvedValue({
							data: { id: 'event-123', event_type: 'online' },
							error: null
						})
					})
				})
			});

			// Mock existing RSVP check (none found)
			mockFrom.mockReturnValueOnce({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							single: vi.fn().mockResolvedValue({
								data: null,
								error: null
							})
						})
					})
				})
			});

			// Mock insert - verify attendance_mode is set to null
			const mockInsert = vi.fn().mockResolvedValue({ error: null });
			mockFrom.mockReturnValueOnce({
				insert: mockInsert
			});

			(supabase.from as ReturnType<typeof vi.fn>).mockImplementation(mockFrom);

			const formData = new FormData();
			formData.append('status', 'going');
			formData.append('attendance_mode', 'in_person');

			const result = await actions.rsvp({
				request: { formData: async () => formData } as any,
				locals: {
					session: {
						user: { id: 'user-123' }
					}
				},
				params: { id: 'event-123' }
			} as any);

			expect(result).toHaveProperty('success', true);
			// Verify that insert was called with attendance_mode: null
			expect(mockInsert).toHaveBeenCalledWith(
				expect.objectContaining({
					attendance_mode: null
				})
			);
		});

		it('should allow interested status without attendance_mode for hybrid events', async () => {
			const mockFrom = vi.fn();

			// Mock event query (hybrid event)
			mockFrom.mockReturnValueOnce({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						single: vi.fn().mockResolvedValue({
							data: { id: 'event-123', event_type: 'hybrid' },
							error: null
						})
					})
				})
			});

			// Mock existing RSVP check (none found)
			mockFrom.mockReturnValueOnce({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							single: vi.fn().mockResolvedValue({
								data: null,
								error: null
							})
						})
					})
				})
			});

			// Mock insert
			mockFrom.mockReturnValueOnce({
				insert: vi.fn().mockResolvedValue({
					error: null
				})
			});

			(supabase.from as ReturnType<typeof vi.fn>).mockImplementation(mockFrom);

			const formData = new FormData();
			formData.append('status', 'interested');
			// No attendance_mode for interested status

			const result = await actions.rsvp({
				request: { formData: async () => formData } as any,
				locals: {
					session: {
						user: { id: 'user-123' }
					}
				},
				params: { id: 'event-123' }
			} as any);

			expect(result).toEqual({ success: true, status: 'interested', attendanceMode: null });
		});

		it('should update existing RSVP with attendance_mode', async () => {
			const mockExistingRsvp = {
				id: 'rsvp-123',
				event_id: 'event-123',
				user_id: 'user-123',
				status: 'interested',
				attendance_mode: null
			};

			const mockFrom = vi.fn();

			// Mock event query (hybrid event)
			mockFrom.mockReturnValueOnce({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						single: vi.fn().mockResolvedValue({
							data: { id: 'event-123', event_type: 'hybrid' },
							error: null
						})
					})
				})
			});

			// Mock existing RSVP check
			mockFrom.mockReturnValueOnce({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							single: vi.fn().mockResolvedValue({
								data: mockExistingRsvp,
								error: null
							})
						})
					})
				})
			});

			// Mock update
			const mockUpdate = vi.fn().mockReturnValue({
				eq: vi.fn().mockResolvedValue({
					error: null
				})
			});
			mockFrom.mockReturnValueOnce({
				update: mockUpdate
			});

			(supabase.from as ReturnType<typeof vi.fn>).mockImplementation(mockFrom);

			const formData = new FormData();
			formData.append('status', 'going');
			formData.append('attendance_mode', 'online');

			const result = await actions.rsvp({
				request: { formData: async () => formData } as any,
				locals: {
					session: {
						user: { id: 'user-123' }
					}
				},
				params: { id: 'event-123' }
			} as any);

			expect(result).toEqual({ success: true, status: 'going', attendanceMode: 'online' });
			// Verify that update was called with attendance_mode
			expect(mockUpdate).toHaveBeenCalledWith(
				expect.objectContaining({
					status: 'going',
					attendance_mode: 'online'
				})
			);
		});
	});

	describe('actions.rsvp - capacity enforcement', () => {
		it('should allow RSVP when event has no capacity limit', async () => {
			const mockFrom = vi.fn();

			// Mock event query (no capacity)
			mockFrom.mockReturnValueOnce({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						single: vi.fn().mockResolvedValue({
							data: { id: 'event-123', event_type: 'online', capacity: null },
							error: null
						})
					})
				})
			});

			// Mock existing RSVP check
			mockFrom.mockReturnValueOnce({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							single: vi.fn().mockResolvedValue({
								data: null,
								error: null
							})
						})
					})
				})
			});

			// Mock insert
			mockFrom.mockReturnValueOnce({
				insert: vi.fn().mockResolvedValue({
					error: null
				})
			});

			(supabase.from as ReturnType<typeof vi.fn>).mockImplementation(mockFrom);

			const formData = new FormData();
			formData.append('status', 'going');

			const result = await actions.rsvp({
				request: { formData: async () => formData } as any,
				locals: {
					session: {
						user: { id: 'user-123' }
					}
				},
				params: { id: 'event-123' }
			} as any);

			expect(result).toEqual({ success: true, status: 'going', attendanceMode: null });
		});

		it('should allow RSVP when capacity is not reached', async () => {
			const mockFrom = vi.fn();

			// Mock event query (capacity: 10)
			mockFrom.mockReturnValueOnce({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						single: vi.fn().mockResolvedValue({
							data: { id: 'event-123', event_type: 'online', capacity: 10 },
							error: null
						})
					})
				})
			});

			// Mock RSVP count (5 going)
			mockFrom.mockReturnValueOnce({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						eq: vi.fn().mockResolvedValue({
							data: [{ id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }, { id: '5' }],
							error: null
						})
					})
				})
			});

			// Mock user current RSVP check
			mockFrom.mockReturnValueOnce({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							single: vi.fn().mockResolvedValue({
								data: null,
								error: null
							})
						})
					})
				})
			});

			// Mock existing RSVP check
			mockFrom.mockReturnValueOnce({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							single: vi.fn().mockResolvedValue({
								data: null,
								error: null
							})
						})
					})
				})
			});

			// Mock insert
			mockFrom.mockReturnValueOnce({
				insert: vi.fn().mockResolvedValue({
					error: null
				})
			});

			(supabase.from as ReturnType<typeof vi.fn>).mockImplementation(mockFrom);

			const formData = new FormData();
			formData.append('status', 'going');

			const result = await actions.rsvp({
				request: { formData: async () => formData } as any,
				locals: {
					session: {
						user: { id: 'user-123' }
					}
				},
				params: { id: 'event-123' }
			} as any);

			expect(result).toEqual({ success: true, status: 'going', attendanceMode: null });
		});

		it('should reject RSVP when capacity is reached', async () => {
			const mockFrom = vi.fn();

			// Mock event query (capacity: 10)
			mockFrom.mockReturnValueOnce({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						single: vi.fn().mockResolvedValue({
							data: { id: 'event-123', event_type: 'online', capacity: 10 },
							error: null
						})
					})
				})
			});

			// Mock RSVP count (10 going - at capacity)
			mockFrom.mockReturnValueOnce({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						eq: vi.fn().mockResolvedValue({
							data: Array(10).fill({ id: 'rsvp' }),
							error: null
						})
					})
				})
			});

			// Mock user current RSVP check (user is not going)
			mockFrom.mockReturnValueOnce({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							single: vi.fn().mockResolvedValue({
								data: { status: 'interested' },
								error: null
							})
						})
					})
				})
			});

			(supabase.from as ReturnType<typeof vi.fn>).mockImplementation(mockFrom);

			const formData = new FormData();
			formData.append('status', 'going');

			const result = await actions.rsvp({
				request: { formData: async () => formData } as any,
				locals: {
					session: {
						user: { id: 'user-123' }
					}
				},
				params: { id: 'event-123' }
			} as any);

			expect(result).toHaveProperty('status', 400);
			expect(result).toHaveProperty(
				'data.error',
				'Event is at capacity (10 attendees). You have been added to the waitlist.'
			);
		});

		it('should allow user to change their existing going RSVP even when at capacity', async () => {
			const mockFrom = vi.fn();

			// Mock event query (capacity: 10)
			mockFrom.mockReturnValueOnce({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						single: vi.fn().mockResolvedValue({
							data: { id: 'event-123', event_type: 'online', capacity: 10 },
							error: null
						})
					})
				})
			});

			// Mock RSVP count (10 going - at capacity)
			mockFrom.mockReturnValueOnce({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						eq: vi.fn().mockResolvedValue({
							data: Array(10).fill({ id: 'rsvp' }),
							error: null
						})
					})
				})
			});

			// Mock user current RSVP check (user is already going)
			mockFrom.mockReturnValueOnce({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							single: vi.fn().mockResolvedValue({
								data: { status: 'going' },
								error: null
							})
						})
					})
				})
			});

			// Mock existing RSVP check
			mockFrom.mockReturnValueOnce({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							single: vi.fn().mockResolvedValue({
								data: { id: 'rsvp-123', status: 'going' },
								error: null
							})
						})
					})
				})
			});

			// Mock update
			mockFrom.mockReturnValueOnce({
				update: vi.fn().mockReturnValue({
					eq: vi.fn().mockResolvedValue({
						error: null
					})
				})
			});

			(supabase.from as ReturnType<typeof vi.fn>).mockImplementation(mockFrom);

			const formData = new FormData();
			formData.append('status', 'going');

			const result = await actions.rsvp({
				request: { formData: async () => formData } as any,
				locals: {
					session: {
						user: { id: 'user-123' }
					}
				},
				params: { id: 'event-123' }
			} as any);

			expect(result).toEqual({ success: true, status: 'going', attendanceMode: null });
		});

		it('should not enforce capacity for interested status', async () => {
			const mockFrom = vi.fn();

			// Mock event query (capacity: 10)
			mockFrom.mockReturnValueOnce({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						single: vi.fn().mockResolvedValue({
							data: { id: 'event-123', event_type: 'online', capacity: 10 },
							error: null
						})
					})
				})
			});

			// Mock existing RSVP check
			mockFrom.mockReturnValueOnce({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							single: vi.fn().mockResolvedValue({
								data: null,
								error: null
							})
						})
					})
				})
			});

			// Mock insert
			mockFrom.mockReturnValueOnce({
				insert: vi.fn().mockResolvedValue({
					error: null
				})
			});

			(supabase.from as ReturnType<typeof vi.fn>).mockImplementation(mockFrom);

			const formData = new FormData();
			formData.append('status', 'interested');

			const result = await actions.rsvp({
				request: { formData: async () => formData } as any,
				locals: {
					session: {
						user: { id: 'user-123' }
					}
				},
				params: { id: 'event-123' }
			} as any);

			expect(result).toEqual({ success: true, status: 'interested', attendanceMode: null });
		});

		it('should not enforce capacity for not_going status', async () => {
			const mockFrom = vi.fn();

			// Mock event query (capacity: 10)
			mockFrom.mockReturnValueOnce({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						single: vi.fn().mockResolvedValue({
							data: { id: 'event-123', event_type: 'online', capacity: 10 },
							error: null
						})
					})
				})
			});

			// Mock existing RSVP check
			mockFrom.mockReturnValueOnce({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							single: vi.fn().mockResolvedValue({
								data: null,
								error: null
							})
						})
					})
				})
			});

			// Mock insert
			mockFrom.mockReturnValueOnce({
				insert: vi.fn().mockResolvedValue({
					error: null
				})
			});

			(supabase.from as ReturnType<typeof vi.fn>).mockImplementation(mockFrom);

			const formData = new FormData();
			formData.append('status', 'not_going');

			const result = await actions.rsvp({
				request: { formData: async () => formData } as any,
				locals: {
					session: {
						user: { id: 'user-123' }
					}
				},
				params: { id: 'event-123' }
			} as any);

			expect(result).toEqual({ success: true, status: 'not_going', attendanceMode: null });
		});
	});
});
