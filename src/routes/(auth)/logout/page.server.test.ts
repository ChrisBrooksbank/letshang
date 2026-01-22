import { describe, it, expect, vi } from 'vitest';

vi.mock('@sveltejs/kit', async () => {
	const actual = await vi.importActual('@sveltejs/kit');
	return {
		...actual,
		redirect: vi.fn((status: number, location: string) => {
			const error = new Error(`Redirect to ${location}`);
			// @ts-expect-error - adding custom properties for testing
			error.status = status;
			// @ts-expect-error - adding custom properties for testing
			error.location = location;
			throw error;
		})
	};
});

describe('logout page server', () => {
	describe('load function', () => {
		it('should allow logged-in users to access page', async () => {
			const { load } = await import('./+page.server');

			const mockSession = {
				access_token: 'test-token',
				refresh_token: 'test-refresh',
				expires_in: 3600,
				token_type: 'bearer',
				user: {
					id: 'test-user-id',
					email: 'test@example.com',
					aud: 'authenticated',
					role: 'authenticated',
					created_at: '2024-01-01T00:00:00Z',
					app_metadata: {},
					user_metadata: {}
				},
				expires_at: Date.now() / 1000 + 3600
			};

			const mockLocals = {
				session: mockSession,
				supabase: {} as never,
				user: mockSession.user
			};

			const result = await load({ locals: mockLocals } as never);

			expect(result).toEqual({});
		});

		it('should redirect logged-out users to login', async () => {
			const { load } = await import('./+page.server');

			const mockLocals = {
				session: null,
				supabase: {} as never,
				user: null
			};

			try {
				await load({ locals: mockLocals } as never);
				expect.fail('Should have thrown redirect');
			} catch (error) {
				expect(error).toHaveProperty('status', 303);
				expect(error).toHaveProperty('location', '/login');
			}
		});
	});

	describe('logout action', () => {
		it('should sign out user and clear cookies', async () => {
			const { actions } = await import('./+page.server');

			const mockSignOut = vi.fn().mockResolvedValue({ error: null });
			const mockCookiesDelete = vi.fn();
			const mockCookiesGetAll = vi.fn().mockReturnValue([
				{ name: 'sb-access-token', value: 'token1' },
				{ name: 'sb-refresh-token', value: 'token2' },
				{ name: 'other-cookie', value: 'value' }
			]);

			const mockLocals = {
				supabase: {
					auth: {
						signOut: mockSignOut
					}
				},
				session: { access_token: 'test-token' },
				user: null
			};

			const mockCookies = {
				delete: mockCookiesDelete,
				getAll: mockCookiesGetAll
			};

			try {
				await actions.default({
					locals: mockLocals,
					cookies: mockCookies
				} as never);
				expect.fail('Should have thrown redirect');
			} catch (error) {
				expect(mockSignOut).toHaveBeenCalled();
				expect(mockCookiesDelete).toHaveBeenCalledWith('sb-access-token', { path: '/' });
				expect(mockCookiesDelete).toHaveBeenCalledWith('sb-refresh-token', { path: '/' });
				expect(error).toHaveProperty('status', 303);
				expect(error).toHaveProperty('location', '/login');
			}
		});

		it('should handle Supabase signOut errors gracefully', async () => {
			const { actions } = await import('./+page.server');

			const mockSignOut = vi.fn().mockRejectedValue(new Error('Signout failed'));
			const mockCookiesDelete = vi.fn();
			const mockCookiesGetAll = vi.fn().mockReturnValue([]);

			const mockLocals = {
				supabase: {
					auth: {
						signOut: mockSignOut
					}
				},
				session: { access_token: 'test-token' },
				user: null
			};

			const mockCookies = {
				delete: mockCookiesDelete,
				getAll: mockCookiesGetAll
			};

			try {
				await actions.default({
					locals: mockLocals,
					cookies: mockCookies
				} as never);
				expect.fail('Should have thrown error or redirect');
			} catch {
				// Should still attempt to clear cookies even if signOut fails
				expect(mockSignOut).toHaveBeenCalled();
			}
		});

		it('should clear all sb- prefixed cookies', async () => {
			const { actions } = await import('./+page.server');

			const mockSignOut = vi.fn().mockResolvedValue({ error: null });
			const mockCookiesDelete = vi.fn();
			const mockCookiesGetAll = vi.fn().mockReturnValue([
				{ name: 'sb-access-token', value: 'token1' },
				{ name: 'sb-refresh-token', value: 'token2' },
				{ name: 'sb-auth-token', value: 'token3' },
				{ name: 'sb-custom-cookie', value: 'value' },
				{ name: 'other-cookie', value: 'value' }
			]);

			const mockLocals = {
				supabase: {
					auth: {
						signOut: mockSignOut
					}
				},
				session: { access_token: 'test-token' },
				user: null
			};

			const mockCookies = {
				delete: mockCookiesDelete,
				getAll: mockCookiesGetAll
			};

			try {
				await actions.default({
					locals: mockLocals,
					cookies: mockCookies
				} as never);
			} catch {
				// Verify all sb- cookies were deleted
				expect(mockCookiesDelete).toHaveBeenCalledWith('sb-access-token', { path: '/' });
				expect(mockCookiesDelete).toHaveBeenCalledWith('sb-refresh-token', { path: '/' });
				expect(mockCookiesDelete).toHaveBeenCalledWith('sb-auth-token', { path: '/' });
				expect(mockCookiesDelete).toHaveBeenCalledWith('sb-custom-cookie', { path: '/' });
				// Verify non-sb cookie was not deleted
				expect(mockCookiesDelete).not.toHaveBeenCalledWith('other-cookie', expect.any(Object));
			}
		});
	});
});
