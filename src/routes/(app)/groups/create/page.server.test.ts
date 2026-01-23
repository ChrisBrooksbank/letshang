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

describe('Group Creation Page Server', () => {
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

		it('should return form and topics when user is authenticated', async () => {
			const mockTopics = [
				{ id: '1', name: 'Tech', category: 'Technology' },
				{ id: '2', name: 'Sports', category: 'Sports' }
			];

			// Need to chain .order() twice, so create a mock that returns another order function
			const mockOrderChain = {
				order: vi.fn().mockResolvedValue({ data: mockTopics, error: null })
			};

			const mockSupabase = {
				auth: {
					getSession: vi.fn().mockResolvedValue({
						data: { session: { user: { id: 'user-123' } } }
					})
				},
				from: vi.fn().mockReturnValue({
					select: vi.fn().mockReturnThis(),
					order: vi.fn().mockReturnValue(mockOrderChain)
				})
			};

			const mockLocals = {
				supabase: mockSupabase
			};

			const mockForm = { data: {}, errors: {} };
			vi.mocked(superValidate).mockResolvedValue(mockForm as never);

			const result = await load({ locals: mockLocals } as never);

			expect(result).toEqual({ form: mockForm, topics: mockTopics });
			expect(superValidate).toHaveBeenCalled();
		});

		it('should handle topics fetch error gracefully', async () => {
			// Need to chain .order() twice
			const mockOrderChain = {
				order: vi.fn().mockResolvedValue({ data: null, error: { message: 'Database error' } })
			};

			const mockSupabase = {
				auth: {
					getSession: vi.fn().mockResolvedValue({
						data: { session: { user: { id: 'user-123' } } }
					})
				},
				from: vi.fn().mockReturnValue({
					select: vi.fn().mockReturnThis(),
					order: vi.fn().mockReturnValue(mockOrderChain)
				})
			};

			const mockLocals = {
				supabase: mockSupabase
			};

			const mockForm = { data: {}, errors: {} };
			vi.mocked(superValidate).mockResolvedValue(mockForm as never);

			const result = await load({ locals: mockLocals } as never);

			expect(result).toEqual({ form: mockForm, topics: [] });
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

			const mockRequest = new Request('http://localhost/groups/create', {
				method: 'POST',
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
				body: new URLSearchParams({
					name: 'Test Group',
					group_type: 'public',
					topic_ids: JSON.stringify(['topic-1'])
				})
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

		it('should return validation error for invalid data', async () => {
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

			const mockRequest = new Request('http://localhost/groups/create', {
				method: 'POST',
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
				body: new URLSearchParams({
					name: 'ab', // Too short
					group_type: 'public',
					topic_ids: JSON.stringify([])
				})
			});

			const mockForm = { valid: false, data: {}, errors: {} };
			vi.mocked(superValidate).mockResolvedValue(mockForm as never);

			const result = await actions.default({
				request: mockRequest,
				locals: mockLocals
			} as never);

			expect(result).toMatchObject({
				status: 400,
				data: { form: mockForm }
			});
		});

		it('should create a public group successfully', async () => {
			const mockGroup = { id: 'group-123', name: 'Test Group' };

			const mockSupabase = {
				auth: {
					getSession: vi.fn().mockResolvedValue({
						data: { session: { user: { id: 'user-123' } } }
					})
				},
				from: vi
					.fn()
					.mockReturnValueOnce({
						insert: vi.fn().mockReturnThis(),
						select: vi.fn().mockReturnThis(),
						single: vi.fn().mockResolvedValue({ data: mockGroup, error: null })
					})
					.mockReturnValueOnce({
						insert: vi.fn().mockResolvedValue({ error: null })
					})
			};

			const mockLocals = {
				supabase: mockSupabase
			};

			const mockRequest = new Request('http://localhost/groups/create', {
				method: 'POST',
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
				body: new URLSearchParams({
					name: 'Test Group',
					description: 'A test group',
					group_type: 'public',
					location: 'San Francisco',
					topic_ids: JSON.stringify(['topic-1', 'topic-2'])
				})
			});

			const mockForm = {
				valid: true,
				data: {
					name: 'Test Group',
					description: 'A test group',
					group_type: 'public',
					location: 'San Francisco',
					topic_ids: ['topic-1', 'topic-2']
				}
			};
			vi.mocked(superValidate).mockResolvedValue(mockForm as never);

			await expect(
				actions.default({
					request: mockRequest,
					locals: mockLocals
				} as never)
			).rejects.toMatchObject({
				status: 303,
				location: '/dashboard'
			});
		});

		it('should create a private group with minimal fields', async () => {
			const mockGroup = { id: 'group-456', name: 'Private Group' };

			const mockSupabase = {
				auth: {
					getSession: vi.fn().mockResolvedValue({
						data: { session: { user: { id: 'user-123' } } }
					})
				},
				from: vi
					.fn()
					.mockReturnValueOnce({
						insert: vi.fn().mockReturnThis(),
						select: vi.fn().mockReturnThis(),
						single: vi.fn().mockResolvedValue({ data: mockGroup, error: null })
					})
					.mockReturnValueOnce({
						insert: vi.fn().mockResolvedValue({ error: null })
					})
			};

			const mockLocals = {
				supabase: mockSupabase
			};

			const mockRequest = new Request('http://localhost/groups/create', {
				method: 'POST',
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
				body: new URLSearchParams({
					name: 'Private Group',
					group_type: 'private',
					topic_ids: JSON.stringify(['topic-1'])
				})
			});

			const mockForm = {
				valid: true,
				data: {
					name: 'Private Group',
					description: null,
					group_type: 'private',
					location: null,
					topic_ids: ['topic-1']
				}
			};
			vi.mocked(superValidate).mockResolvedValue(mockForm as never);

			await expect(
				actions.default({
					request: mockRequest,
					locals: mockLocals
				} as never)
			).rejects.toMatchObject({
				status: 303,
				location: '/dashboard'
			});
		});

		it('should handle database errors on group insert', async () => {
			const mockSupabase = {
				auth: {
					getSession: vi.fn().mockResolvedValue({
						data: { session: { user: { id: 'user-123' } } }
					})
				},
				from: vi.fn().mockReturnValue({
					insert: vi.fn().mockReturnThis(),
					select: vi.fn().mockReturnThis(),
					single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Database error' } })
				})
			};

			const mockLocals = {
				supabase: mockSupabase
			};

			const mockRequest = new Request('http://localhost/groups/create', {
				method: 'POST',
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
				body: new URLSearchParams({
					name: 'Test Group',
					group_type: 'public',
					topic_ids: JSON.stringify(['topic-1'])
				})
			});

			const mockForm = {
				valid: true,
				data: {
					name: 'Test Group',
					group_type: 'public',
					topic_ids: ['topic-1']
				}
			};
			vi.mocked(superValidate).mockResolvedValue(mockForm as never);

			const result = await actions.default({
				request: mockRequest,
				locals: mockLocals
			} as never);

			expect(result).toMatchObject({
				status: 500
			});
		});

		it('should continue despite topic insert errors', async () => {
			const mockGroup = { id: 'group-123', name: 'Test Group' };

			const mockSupabase = {
				auth: {
					getSession: vi.fn().mockResolvedValue({
						data: { session: { user: { id: 'user-123' } } }
					})
				},
				from: vi
					.fn()
					.mockReturnValueOnce({
						insert: vi.fn().mockReturnThis(),
						select: vi.fn().mockReturnThis(),
						single: vi.fn().mockResolvedValue({ data: mockGroup, error: null })
					})
					.mockReturnValueOnce({
						insert: vi.fn().mockResolvedValue({ error: { message: 'Topic insert failed' } })
					})
			};

			const mockLocals = {
				supabase: mockSupabase
			};

			const mockRequest = new Request('http://localhost/groups/create', {
				method: 'POST',
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
				body: new URLSearchParams({
					name: 'Test Group',
					group_type: 'public',
					topic_ids: JSON.stringify(['topic-1'])
				})
			});

			const mockForm = {
				valid: true,
				data: {
					name: 'Test Group',
					group_type: 'public',
					topic_ids: ['topic-1']
				}
			};
			vi.mocked(superValidate).mockResolvedValue(mockForm as never);

			// Should still redirect despite topic error
			await expect(
				actions.default({
					request: mockRequest,
					locals: mockLocals
				} as never)
			).rejects.toMatchObject({
				status: 303,
				location: '/dashboard'
			});
		});

		it('should handle group with cover image', async () => {
			const mockGroup = { id: 'group-123', name: 'Test Group' };

			const mockSupabase = {
				auth: {
					getSession: vi.fn().mockResolvedValue({
						data: { session: { user: { id: 'user-123' } } }
					})
				},
				from: vi
					.fn()
					.mockReturnValueOnce({
						insert: vi.fn().mockReturnThis(),
						select: vi.fn().mockReturnThis(),
						single: vi.fn().mockResolvedValue({ data: mockGroup, error: null })
					})
					.mockReturnValueOnce({
						insert: vi.fn().mockResolvedValue({ error: null })
					})
			};

			const mockLocals = {
				supabase: mockSupabase
			};

			const mockRequest = new Request('http://localhost/groups/create', {
				method: 'POST',
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
				body: new URLSearchParams({
					name: 'Test Group',
					cover_image_url: 'data:image/png;base64,abc123',
					group_type: 'public',
					topic_ids: JSON.stringify(['topic-1'])
				})
			});

			const mockForm = {
				valid: true,
				data: {
					name: 'Test Group',
					cover_image_url: 'data:image/png;base64,abc123',
					group_type: 'public',
					topic_ids: ['topic-1']
				}
			};
			vi.mocked(superValidate).mockResolvedValue(mockForm as never);

			await expect(
				actions.default({
					request: mockRequest,
					locals: mockLocals
				} as never)
			).rejects.toMatchObject({
				status: 303,
				location: '/dashboard'
			});
		});
	});
});
