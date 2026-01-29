import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './+server.js';

// Mock the createServerClient from @supabase/ssr
vi.mock('@supabase/ssr', () => ({
	createServerClient: vi.fn()
}));

// Get the mocked function
import { createServerClient } from '@supabase/ssr';
const mockCreateServerClient = vi.mocked(createServerClient);

describe('auth callback handler', () => {
	let mockExchangeCodeForSession: ReturnType<typeof vi.fn>;
	let mockCookies: {
		getAll: ReturnType<typeof vi.fn>;
		set: ReturnType<typeof vi.fn>;
	};

	beforeEach(() => {
		vi.clearAllMocks();

		mockExchangeCodeForSession = vi.fn();
		mockCookies = {
			getAll: vi.fn().mockReturnValue([]),
			set: vi.fn()
		};

		// Setup default mock for createServerClient
		mockCreateServerClient.mockReturnValue({
			auth: {
				exchangeCodeForSession: mockExchangeCodeForSession
			}
		} as any);
	});

	describe('email verification flow', () => {
		it('should exchange code for session and redirect to dashboard', async () => {
			mockExchangeCodeForSession.mockResolvedValue({
				data: { session: {}, user: {} },
				error: null
			});
			const mockUrl = new URL('http://localhost:5173/auth/callback?code=test-verification-code');

			await expect(
				GET({
					url: mockUrl,
					// @ts-expect-error - Partial mock for testing
					cookies: mockCookies
				})
			).rejects.toThrow();

			expect(mockExchangeCodeForSession).toHaveBeenCalledWith('test-verification-code');
		});

		it('should redirect to custom next URL when provided', async () => {
			mockExchangeCodeForSession.mockResolvedValue({
				data: { session: {}, user: {} },
				error: null
			});
			const mockUrl = new URL('http://localhost:5173/auth/callback?code=test-code&next=/events');

			try {
				await GET({
					url: mockUrl,
					// @ts-expect-error - Partial mock for testing
					cookies: mockCookies
				});
			} catch (error: any) {
				expect(error.status).toBe(303);
				expect(error.location).toBe('/events');
			}

			expect(mockExchangeCodeForSession).toHaveBeenCalledWith('test-code');
		});

		it('should redirect to login with error when code exchange fails', async () => {
			const mockError = { message: 'Invalid verification code', status: 400 };
			mockExchangeCodeForSession.mockResolvedValue({ data: {}, error: mockError });
			const mockUrl = new URL('http://localhost:5173/auth/callback?code=invalid-code');

			try {
				await GET({
					url: mockUrl,
					// @ts-expect-error - Partial mock for testing
					cookies: mockCookies
				});
			} catch (error: any) {
				expect(error.status).toBe(303);
				expect(error.location).toContain('/login?error=');
				expect(error.location).toContain('Invalid%20verification%20code');
			}

			expect(mockExchangeCodeForSession).toHaveBeenCalledWith('invalid-code');
		});

		it('should handle missing code parameter', async () => {
			const mockUrl = new URL('http://localhost:5173/auth/callback');

			try {
				await GET({
					url: mockUrl,
					// @ts-expect-error - Partial mock for testing
					cookies: mockCookies
				});
			} catch (error: any) {
				expect(error.status).toBe(303);
				expect(error.location).toBe('/dashboard');
			}

			// Should not call exchangeCodeForSession when no code is provided
			expect(mockExchangeCodeForSession).not.toHaveBeenCalled();
		});
	});

	describe('OAuth flow support', () => {
		it('should work with OAuth callback codes', async () => {
			mockExchangeCodeForSession.mockResolvedValue({
				data: { session: {}, user: {} },
				error: null
			});
			const mockUrl = new URL('http://localhost:5173/auth/callback?code=oauth-code-xyz');

			try {
				await GET({
					url: mockUrl,
					// @ts-expect-error - Partial mock for testing
					cookies: mockCookies
				});
			} catch (error: any) {
				expect(error.status).toBe(303);
			}

			expect(mockExchangeCodeForSession).toHaveBeenCalledWith('oauth-code-xyz');
		});
	});

	describe('edge cases', () => {
		it('should handle empty code parameter', async () => {
			const mockUrl = new URL('http://localhost:5173/auth/callback?code=');

			try {
				await GET({
					url: mockUrl,
					// @ts-expect-error - Partial mock for testing
					cookies: mockCookies
				});
			} catch (error: any) {
				expect(error.status).toBe(303);
				expect(error.location).toBe('/dashboard');
			}

			// Empty code is falsy, so should not call exchangeCodeForSession
			expect(mockExchangeCodeForSession).not.toHaveBeenCalled();
		});

		it('should URL decode next parameter correctly', async () => {
			mockExchangeCodeForSession.mockResolvedValue({
				data: { session: {}, user: {} },
				error: null
			});
			const mockUrl = new URL(
				'http://localhost:5173/auth/callback?code=test-code&next=%2Fevents%2F123'
			);

			try {
				await GET({
					url: mockUrl,
					// @ts-expect-error - Partial mock for testing
					cookies: mockCookies
				});
			} catch (error: any) {
				expect(error.status).toBe(303);
				expect(error.location).toBe('/events/123');
			}
		});
	});
});
