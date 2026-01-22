import { describe, it, expect } from 'vitest';
import { load } from './+layout.server';
import type { Session, User } from '@supabase/supabase-js';

interface RedirectError {
	status: number;
	location: string;
}

describe('(app) layout server load', () => {
	it('should redirect to login when no session exists', async () => {
		const mockLocals = {
			session: null,
			user: null
		};

		const mockUrl = new URL('http://localhost:5173/dashboard');

		try {
			await load({ locals: mockLocals, url: mockUrl } as never);
			// If we get here, the test should fail
			expect.fail('Expected redirect to be thrown');
		} catch (error) {
			// Check if it's a redirect error
			const redirectError = error as RedirectError;
			expect(redirectError.status).toBe(303);
			expect(redirectError.location).toContain('/login');
			expect(redirectError.location).toContain('redirectTo=%2Fdashboard');
		}
	});

	it('should redirect to login with query params preserved', async () => {
		const mockLocals = {
			session: null,
			user: null
		};

		const mockUrl = new URL('http://localhost:5173/dashboard?tab=settings&foo=bar');

		try {
			await load({ locals: mockLocals, url: mockUrl } as never);
			expect.fail('Expected redirect to be thrown');
		} catch (error) {
			const redirectError = error as RedirectError;
			expect(redirectError.status).toBe(303);
			expect(redirectError.location).toContain('/login');
			expect(redirectError.location).toContain('redirectTo=');
			expect(redirectError.location).toContain('%2Fdashboard');
		}
	});

	it('should return session and user when authenticated', async () => {
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

		const mockLocals = {
			session: mockSession,
			user: mockUser
		};

		const mockUrl = new URL('http://localhost:5173/dashboard');

		const result = await load({ locals: mockLocals, url: mockUrl } as never);

		if (!result) {
			expect.fail('Expected result to be defined');
		}

		expect(result.session).toEqual(mockSession);
		expect(result.user).toEqual(mockUser);
	});

	it('should handle root path redirect', async () => {
		const mockLocals = {
			session: null,
			user: null
		};

		const mockUrl = new URL('http://localhost:5173/');

		try {
			await load({ locals: mockLocals, url: mockUrl } as never);
			expect.fail('Expected redirect to be thrown');
		} catch (error) {
			const redirectError = error as RedirectError;
			expect(redirectError.status).toBe(303);
			expect(redirectError.location).toContain('/login');
		}
	});
});
