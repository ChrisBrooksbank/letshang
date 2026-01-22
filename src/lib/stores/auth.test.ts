import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { get } from 'svelte/store';
import { auth } from './auth';
import type { User, Session, SupabaseClient, AuthChangeEvent } from '@supabase/supabase-js';

describe('auth store', () => {
	beforeEach(() => {
		// Reset the store before each test
		auth.reset();
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.useRealTimers();
	});

	it('should initialize with default state', () => {
		const state = get(auth);
		expect(state.user).toBeNull();
		expect(state.session).toBeNull();
		expect(state.loading).toBe(true);
	});

	it('should set auth state with user and session', () => {
		const mockUser: User = {
			id: 'test-user-id',
			email: 'test@example.com',
			aud: 'authenticated',
			role: 'authenticated',
			created_at: '2024-01-01T00:00:00Z',
			app_metadata: {},
			user_metadata: {}
		};

		const mockSession: Session = {
			access_token: 'test-access-token',
			refresh_token: 'test-refresh-token',
			expires_in: 3600,
			token_type: 'bearer',
			user: mockUser,
			expires_at: Date.now() / 1000 + 3600
		};

		auth.setAuth(mockUser, mockSession);

		const state = get(auth);
		expect(state.user).toEqual(mockUser);
		expect(state.session).toEqual(mockSession);
		expect(state.loading).toBe(false);
	});

	it('should clear auth state', () => {
		const mockUser: User = {
			id: 'test-user-id',
			email: 'test@example.com',
			aud: 'authenticated',
			role: 'authenticated',
			created_at: '2024-01-01T00:00:00Z',
			app_metadata: {},
			user_metadata: {}
		};

		const mockSession: Session = {
			access_token: 'test-access-token',
			refresh_token: 'test-refresh-token',
			expires_in: 3600,
			token_type: 'bearer',
			user: mockUser,
			expires_at: Date.now() / 1000 + 3600
		};

		auth.setAuth(mockUser, mockSession);
		auth.clearAuth();

		const state = get(auth);
		expect(state.user).toBeNull();
		expect(state.session).toBeNull();
		expect(state.loading).toBe(false);
	});

	it('should set loading state', () => {
		auth.setLoading(true);
		let state = get(auth);
		expect(state.loading).toBe(true);

		auth.setLoading(false);
		state = get(auth);
		expect(state.loading).toBe(false);
	});

	it('should reset to initial state', () => {
		const mockUser: User = {
			id: 'test-user-id',
			email: 'test@example.com',
			aud: 'authenticated',
			role: 'authenticated',
			created_at: '2024-01-01T00:00:00Z',
			app_metadata: {},
			user_metadata: {}
		};

		const mockSession: Session = {
			access_token: 'test-access-token',
			refresh_token: 'test-refresh-token',
			expires_in: 3600,
			token_type: 'bearer',
			user: mockUser,
			expires_at: Date.now() / 1000 + 3600
		};

		auth.setAuth(mockUser, mockSession);
		auth.reset();

		const state = get(auth);
		expect(state.user).toBeNull();
		expect(state.session).toBeNull();
		expect(state.loading).toBe(true);
	});

	it('should handle null user and session', () => {
		auth.setAuth(null, null);

		const state = get(auth);
		expect(state.user).toBeNull();
		expect(state.session).toBeNull();
		expect(state.loading).toBe(false);
	});

	describe('session management and token refresh', () => {
		it('should initialize with Supabase client and set up auth listener', () => {
			const mockOnAuthStateChange = vi.fn(() => ({
				data: {
					subscription: {
						unsubscribe: vi.fn()
					}
				}
			}));

			const mockSupabase = {
				auth: {
					onAuthStateChange: mockOnAuthStateChange,
					refreshSession: vi.fn()
				}
			} as unknown as SupabaseClient;

			auth.initialize(mockSupabase);

			expect(mockOnAuthStateChange).toHaveBeenCalledWith(expect.any(Function));
		});

		it('should schedule token refresh when session is set', () => {
			const futureTimestamp = Math.floor(Date.now() / 1000) + 900; // 15 minutes from now

			const mockUser: User = {
				id: 'test-user-id',
				email: 'test@example.com',
				aud: 'authenticated',
				role: 'authenticated',
				created_at: '2024-01-01T00:00:00Z',
				app_metadata: {},
				user_metadata: {}
			};

			const mockSession: Session = {
				access_token: 'test-access-token',
				refresh_token: 'test-refresh-token',
				expires_in: 900,
				token_type: 'bearer',
				user: mockUser,
				expires_at: futureTimestamp
			};

			auth.setAuth(mockUser, mockSession);

			const state = get(auth);
			expect(state.session).toEqual(mockSession);
		});

		it('should call refreshSession before token expires', async () => {
			const futureTimestamp = Math.floor(Date.now() / 1000) + 900; // 15 minutes from now

			const mockUser: User = {
				id: 'test-user-id',
				email: 'test@example.com',
				aud: 'authenticated',
				role: 'authenticated',
				created_at: '2024-01-01T00:00:00Z',
				app_metadata: {},
				user_metadata: {}
			};

			const mockSession: Session = {
				access_token: 'test-access-token',
				refresh_token: 'test-refresh-token',
				expires_in: 900,
				token_type: 'bearer',
				user: mockUser,
				expires_at: futureTimestamp
			};

			const mockRefreshedSession: Session = {
				...mockSession,
				access_token: 'new-access-token',
				expires_at: Math.floor(Date.now() / 1000) + 1800
			};

			const mockRefreshSession = vi.fn().mockResolvedValue({
				data: {
					session: mockRefreshedSession,
					user: mockUser
				},
				error: null
			});

			const mockSupabase = {
				auth: {
					onAuthStateChange: vi.fn(() => ({
						data: {
							subscription: {
								unsubscribe: vi.fn()
							}
						}
					})),
					refreshSession: mockRefreshSession
				}
			} as unknown as SupabaseClient;

			auth.initialize(mockSupabase);
			auth.setAuth(mockUser, mockSession);

			// Fast-forward time to 2 minutes before expiry (when refresh should trigger)
			await vi.advanceTimersByTimeAsync(780 * 1000); // 13 minutes

			expect(mockRefreshSession).toHaveBeenCalled();
		});

		it('should clear auth on refresh failure', async () => {
			const futureTimestamp = Math.floor(Date.now() / 1000) + 300; // 5 minutes from now

			const mockUser: User = {
				id: 'test-user-id',
				email: 'test@example.com',
				aud: 'authenticated',
				role: 'authenticated',
				created_at: '2024-01-01T00:00:00Z',
				app_metadata: {},
				user_metadata: {}
			};

			const mockSession: Session = {
				access_token: 'test-access-token',
				refresh_token: 'test-refresh-token',
				expires_in: 300,
				token_type: 'bearer',
				user: mockUser,
				expires_at: futureTimestamp
			};

			const mockRefreshSession = vi.fn().mockResolvedValue({
				data: { session: null, user: null },
				error: new Error('Refresh failed')
			});

			const mockSupabase = {
				auth: {
					onAuthStateChange: vi.fn(() => ({
						data: {
							subscription: {
								unsubscribe: vi.fn()
							}
						}
					})),
					refreshSession: mockRefreshSession
				}
			} as unknown as SupabaseClient;

			auth.initialize(mockSupabase);
			auth.setAuth(mockUser, mockSession);

			// Fast-forward time to trigger refresh
			await vi.advanceTimersByTimeAsync(180 * 1000); // 3 minutes (5-2 buffer)

			expect(mockRefreshSession).toHaveBeenCalled();

			const state = get(auth);
			expect(state.user).toBeNull();
			expect(state.session).toBeNull();
		});

		it('should handle auth state change events', () => {
			type AuthCallback = (event: AuthChangeEvent, session: Session | null) => void;
			let authStateCallback: AuthCallback | null = null;

			const mockOnAuthStateChange = vi.fn((callback: AuthCallback) => {
				authStateCallback = callback;
				return {
					data: {
						subscription: {
							unsubscribe: vi.fn()
						}
					}
				};
			});

			const mockSupabase = {
				auth: {
					onAuthStateChange: mockOnAuthStateChange,
					refreshSession: vi.fn()
				}
			} as unknown as SupabaseClient;

			auth.initialize(mockSupabase);

			const mockUser: User = {
				id: 'test-user-id',
				email: 'test@example.com',
				aud: 'authenticated',
				role: 'authenticated',
				created_at: '2024-01-01T00:00:00Z',
				app_metadata: {},
				user_metadata: {}
			};

			const mockSession: Session = {
				access_token: 'test-access-token',
				refresh_token: 'test-refresh-token',
				expires_in: 3600,
				token_type: 'bearer',
				user: mockUser,
				expires_at: Date.now() / 1000 + 3600
			};

			// Simulate SIGNED_IN event
			authStateCallback!('SIGNED_IN', mockSession);

			const state = get(auth);
			expect(state.user).toEqual(mockUser);
			expect(state.session).toEqual(mockSession);
		});

		it('should clear auth on SIGNED_OUT event', () => {
			type AuthCallback = (event: AuthChangeEvent, session: Session | null) => void;
			let authStateCallback: AuthCallback | null = null;

			const mockOnAuthStateChange = vi.fn((callback: AuthCallback) => {
				authStateCallback = callback;
				return {
					data: {
						subscription: {
							unsubscribe: vi.fn()
						}
					}
				};
			});

			const mockSupabase = {
				auth: {
					onAuthStateChange: mockOnAuthStateChange,
					refreshSession: vi.fn()
				}
			} as unknown as SupabaseClient;

			auth.initialize(mockSupabase);

			// First set auth
			const mockUser: User = {
				id: 'test-user-id',
				email: 'test@example.com',
				aud: 'authenticated',
				role: 'authenticated',
				created_at: '2024-01-01T00:00:00Z',
				app_metadata: {},
				user_metadata: {}
			};

			const mockSession: Session = {
				access_token: 'test-access-token',
				refresh_token: 'test-refresh-token',
				expires_in: 3600,
				token_type: 'bearer',
				user: mockUser,
				expires_at: Date.now() / 1000 + 3600
			};

			authStateCallback!('SIGNED_IN', mockSession);

			// Then simulate sign out
			authStateCallback!('SIGNED_OUT', null);

			const state = get(auth);
			expect(state.user).toBeNull();
			expect(state.session).toBeNull();
		});

		it('should clear refresh timer when auth is cleared', () => {
			const futureTimestamp = Math.floor(Date.now() / 1000) + 900;

			const mockUser: User = {
				id: 'test-user-id',
				email: 'test@example.com',
				aud: 'authenticated',
				role: 'authenticated',
				created_at: '2024-01-01T00:00:00Z',
				app_metadata: {},
				user_metadata: {}
			};

			const mockSession: Session = {
				access_token: 'test-access-token',
				refresh_token: 'test-refresh-token',
				expires_in: 900,
				token_type: 'bearer',
				user: mockUser,
				expires_at: futureTimestamp
			};

			auth.setAuth(mockUser, mockSession);
			auth.clearAuth();

			const state = get(auth);
			expect(state.user).toBeNull();
			expect(state.session).toBeNull();
		});

		it('should support manual refresh', async () => {
			const mockUser: User = {
				id: 'test-user-id',
				email: 'test@example.com',
				aud: 'authenticated',
				role: 'authenticated',
				created_at: '2024-01-01T00:00:00Z',
				app_metadata: {},
				user_metadata: {}
			};

			const mockSession: Session = {
				access_token: 'test-access-token',
				refresh_token: 'test-refresh-token',
				expires_in: 3600,
				token_type: 'bearer',
				user: mockUser,
				expires_at: Date.now() / 1000 + 3600
			};

			const mockRefreshedSession: Session = {
				...mockSession,
				access_token: 'new-access-token'
			};

			const mockRefreshSession = vi.fn().mockResolvedValue({
				data: {
					session: mockRefreshedSession,
					user: mockUser
				},
				error: null
			});

			const mockSupabase = {
				auth: {
					onAuthStateChange: vi.fn(() => ({
						data: {
							subscription: {
								unsubscribe: vi.fn()
							}
						}
					})),
					refreshSession: mockRefreshSession
				}
			} as unknown as SupabaseClient;

			auth.initialize(mockSupabase);
			auth.refresh();

			await vi.runAllTimersAsync();

			expect(mockRefreshSession).toHaveBeenCalled();
		});
	});
});
