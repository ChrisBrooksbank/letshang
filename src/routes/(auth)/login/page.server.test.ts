import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fail } from '@sveltejs/kit';

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

describe('login page server', () => {
	describe('load function', () => {
		it('should redirect to dashboard if already logged in', async () => {
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

			await expect(
				// Partial mock for testing
				load({
					locals: mockLocals
				} as never)
			).rejects.toMatchObject({
				status: 303,
				location: '/dashboard'
			});
		});

		it('should return form when not logged in', async () => {
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

			const mockForm = { data: { email: '', password: '', rememberMe: false }, errors: {} };
			vi.mocked(superValidate).mockResolvedValue(mockForm as never);

			// Partial mock for testing
			const result = await load({ locals: mockLocals } as never);

			expect(result).toEqual({ form: mockForm });
			expect(superValidate).toHaveBeenCalled();
		});
	});

	describe('login action', () => {
		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('should fail with 400 when form validation fails', async () => {
			const mockForm = {
				valid: false,
				data: { email: 'invalid', password: '', rememberMe: false },
				errors: { email: ['Invalid email'] }
			};

			vi.mocked(superValidate).mockResolvedValue(mockForm as never);

			const mockRequest = new Request('http://localhost', {
				method: 'POST',
				body: new FormData()
			});

			// Partial mock for testing
			await actions.default({
				request: mockRequest,
				locals: {},
				cookies: { set: vi.fn() }
			} as never);

			expect(fail).toHaveBeenCalledWith(400, { form: mockForm });
		});

		it('should return error for invalid credentials', async () => {
			const mockForm = {
				valid: true,
				data: { email: 'user@example.com', password: 'wrongpassword', rememberMe: false },
				errors: {}
			};

			vi.mocked(superValidate).mockResolvedValue(mockForm as never);

			const mockSupabase = {
				auth: {
					signInWithPassword: vi.fn().mockResolvedValue({
						data: { user: null, session: null },
						error: { message: 'Invalid login credentials' }
					})
				}
			};

			const mockRequest = new Request('http://localhost', {
				method: 'POST',
				body: new FormData()
			});

			// Partial mock for testing
			await actions.default({
				request: mockRequest,
				locals: { supabase: mockSupabase },
				cookies: { set: vi.fn() }
			} as never);

			expect(fail).toHaveBeenCalledWith(400, {
				form: expect.objectContaining({
					errors: {
						_errors: ['Invalid email or password']
					}
				})
			});
		});

		it('should prevent login for unverified email', async () => {
			const mockForm = {
				valid: true,
				data: { email: 'user@example.com', password: 'password123', rememberMe: false },
				errors: {}
			};

			vi.mocked(superValidate).mockResolvedValue(mockForm as never);

			const mockSupabase = {
				auth: {
					signInWithPassword: vi.fn().mockResolvedValue({
						data: {
							user: { id: 'user-123', email_confirmed_at: null },
							session: { access_token: 'token' }
						},
						error: null
					}),
					signOut: vi.fn().mockResolvedValue({})
				}
			};

			const mockRequest = new Request('http://localhost', {
				method: 'POST',
				body: new FormData()
			});

			// Partial mock for testing
			await actions.default({
				request: mockRequest,
				locals: { supabase: mockSupabase },
				cookies: { set: vi.fn() }
			} as never);

			expect(mockSupabase.auth.signOut).toHaveBeenCalled();
			expect(fail).toHaveBeenCalledWith(400, {
				form: expect.objectContaining({
					errors: {
						_errors: [
							'Please verify your email address. Check your inbox for the verification link.'
						]
					}
				})
			});
		});

		it('should redirect to dashboard on successful login', async () => {
			const mockForm = {
				valid: true,
				data: { email: 'user@example.com', password: 'password123', rememberMe: false },
				errors: {}
			};

			vi.mocked(superValidate).mockResolvedValue(mockForm as never);

			const mockSupabase = {
				auth: {
					signInWithPassword: vi.fn().mockResolvedValue({
						data: {
							user: {
								id: 'user-123',
								email: 'user@example.com',
								email_confirmed_at: '2024-01-01T00:00:00Z'
							},
							session: { access_token: 'token-123' }
						},
						error: null
					})
				}
			};

			const mockCookies = {
				set: vi.fn()
			};

			const mockRequest = new Request('http://localhost', {
				method: 'POST',
				body: new FormData()
			});

			await expect(
				// Partial mock for testing
				actions.default({
					request: mockRequest,
					locals: { supabase: mockSupabase },
					cookies: mockCookies
				} as never)
			).rejects.toMatchObject({
				status: 303,
				location: '/dashboard'
			});

			expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
				email: 'user@example.com',
				password: 'password123'
			});
		});

		it('should set shorter cookie duration when rememberMe is false', async () => {
			const mockForm = {
				valid: true,
				data: { email: 'user@example.com', password: 'password123', rememberMe: false },
				errors: {}
			};

			vi.mocked(superValidate).mockResolvedValue(mockForm as never);

			const mockSupabase = {
				auth: {
					signInWithPassword: vi.fn().mockResolvedValue({
						data: {
							user: {
								id: 'user-123',
								email: 'user@example.com',
								email_confirmed_at: '2024-01-01T00:00:00Z'
							},
							session: { access_token: 'token-123' }
						},
						error: null
					})
				}
			};

			const mockCookies = {
				set: vi.fn()
			};

			const mockRequest = new Request('http://localhost', {
				method: 'POST',
				body: new FormData()
			});

			await expect(
				// Partial mock for testing
				actions.default({
					request: mockRequest,
					locals: { supabase: mockSupabase },
					cookies: mockCookies
				} as never)
			).rejects.toMatchObject({
				status: 303,
				location: '/dashboard'
			});

			expect(mockCookies.set).toHaveBeenCalledWith(
				'sb-access-token',
				'token-123',
				expect.objectContaining({
					maxAge: 60 * 60 * 24 // 24 hours
				})
			);
		});

		it('should set longer cookie duration when rememberMe is true', async () => {
			const mockForm = {
				valid: true,
				data: { email: 'user@example.com', password: 'password123', rememberMe: true },
				errors: {}
			};

			vi.mocked(superValidate).mockResolvedValue(mockForm as never);

			const mockSupabase = {
				auth: {
					signInWithPassword: vi.fn().mockResolvedValue({
						data: {
							user: {
								id: 'user-123',
								email: 'user@example.com',
								email_confirmed_at: '2024-01-01T00:00:00Z'
							},
							session: { access_token: 'token-123' }
						},
						error: null
					})
				}
			};

			const mockCookies = {
				set: vi.fn()
			};

			const mockRequest = new Request('http://localhost', {
				method: 'POST',
				body: new FormData()
			});

			await expect(
				// Partial mock for testing
				actions.default({
					request: mockRequest,
					locals: { supabase: mockSupabase },
					cookies: mockCookies
				} as never)
			).rejects.toMatchObject({
				status: 303,
				location: '/dashboard'
			});

			expect(mockCookies.set).toHaveBeenCalledWith(
				'sb-access-token',
				'token-123',
				expect.objectContaining({
					maxAge: 60 * 60 * 24 * 7 // 7 days
				})
			);
		});

		it('should not reveal if email exists (email enumeration prevention)', async () => {
			const mockForm = {
				valid: true,
				data: { email: 'nonexistent@example.com', password: 'password123', rememberMe: false },
				errors: {}
			};

			vi.mocked(superValidate).mockResolvedValue(mockForm as never);

			const mockSupabase = {
				auth: {
					signInWithPassword: vi.fn().mockResolvedValue({
						data: { user: null, session: null },
						error: { message: 'User not found' }
					})
				}
			};

			const mockRequest = new Request('http://localhost', {
				method: 'POST',
				body: new FormData()
			});

			// Partial mock for testing
			await actions.default({
				request: mockRequest,
				locals: { supabase: mockSupabase },
				cookies: { set: vi.fn() }
			} as never);

			// Error message should be generic, not revealing if email exists
			expect(fail).toHaveBeenCalledWith(400, {
				form: expect.objectContaining({
					errors: {
						_errors: ['Invalid email or password']
					}
				})
			});
		});
	});
});
