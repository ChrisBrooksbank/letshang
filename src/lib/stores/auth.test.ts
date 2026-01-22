import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { auth } from './auth';
import type { User, Session } from '@supabase/supabase-js';

describe('auth store', () => {
	beforeEach(() => {
		// Reset the store before each test
		auth.reset();
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
});
