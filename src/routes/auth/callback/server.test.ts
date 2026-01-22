import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './+server.js';

describe('auth callback handler', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('email verification flow', () => {
		it('should exchange code for session and redirect to dashboard', async () => {
			const mockExchangeCodeForSession = vi.fn().mockResolvedValue({ error: null });
			const mockUrl = new URL('http://localhost:5173/auth/callback?code=test-verification-code');

			const mockLocals = {
				supabase: {
					auth: {
						exchangeCodeForSession: mockExchangeCodeForSession
					}
				}
			};

			await expect(
				GET({
					url: mockUrl,
					// @ts-expect-error - Partial mock of locals for testing
					locals: mockLocals
				})
			).rejects.toThrow();

			expect(mockExchangeCodeForSession).toHaveBeenCalledWith('test-verification-code');
		});

		it('should redirect to custom next URL when provided', async () => {
			const mockExchangeCodeForSession = vi.fn().mockResolvedValue({ error: null });
			const mockUrl = new URL('http://localhost:5173/auth/callback?code=test-code&next=/events');

			const mockLocals = {
				supabase: {
					auth: {
						exchangeCodeForSession: mockExchangeCodeForSession
					}
				}
			};

			try {
				await GET({
					url: mockUrl,
					// @ts-expect-error - Partial mock of locals for testing
					locals: mockLocals
				});
			} catch (error: any) {
				expect(error.status).toBe(303);
				expect(error.location).toBe('/events');
			}

			expect(mockExchangeCodeForSession).toHaveBeenCalledWith('test-code');
		});

		it('should redirect to login with error when code exchange fails', async () => {
			const mockError = { message: 'Invalid verification code', status: 400 };
			const mockExchangeCodeForSession = vi.fn().mockResolvedValue({ error: mockError });
			const mockUrl = new URL('http://localhost:5173/auth/callback?code=invalid-code');

			const mockLocals = {
				supabase: {
					auth: {
						exchangeCodeForSession: mockExchangeCodeForSession
					}
				}
			};

			try {
				await GET({
					url: mockUrl,
					// @ts-expect-error - Partial mock of locals for testing
					locals: mockLocals
				});
			} catch (error: any) {
				expect(error.status).toBe(303);
				expect(error.location).toContain('/login?error=');
				expect(error.location).toContain('Verification%20failed');
			}

			expect(mockExchangeCodeForSession).toHaveBeenCalledWith('invalid-code');
		});

		it('should handle missing code parameter', async () => {
			const mockUrl = new URL('http://localhost:5173/auth/callback');

			const mockLocals = {
				supabase: {
					auth: {
						exchangeCodeForSession: vi.fn()
					}
				}
			};

			try {
				await GET({
					url: mockUrl,
					// @ts-expect-error - Partial mock of locals for testing
					locals: mockLocals
				});
			} catch (error: any) {
				expect(error.status).toBe(303);
				expect(error.location).toBe('/dashboard');
			}

			// Should not call exchangeCodeForSession when no code is provided
			expect(mockLocals.supabase.auth.exchangeCodeForSession).not.toHaveBeenCalled();
		});
	});

	describe('OAuth flow support', () => {
		it('should work with OAuth callback codes', async () => {
			const mockExchangeCodeForSession = vi.fn().mockResolvedValue({ error: null });
			const mockUrl = new URL('http://localhost:5173/auth/callback?code=oauth-code-xyz');

			const mockLocals = {
				supabase: {
					auth: {
						exchangeCodeForSession: mockExchangeCodeForSession
					}
				}
			};

			try {
				await GET({
					url: mockUrl,
					// @ts-expect-error - Partial mock of locals for testing
					locals: mockLocals
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

			const mockLocals = {
				supabase: {
					auth: {
						exchangeCodeForSession: vi.fn()
					}
				}
			};

			try {
				await GET({
					url: mockUrl,
					// @ts-expect-error - Partial mock of locals for testing
					locals: mockLocals
				});
			} catch (error: any) {
				expect(error.status).toBe(303);
				expect(error.location).toBe('/dashboard');
			}

			// Empty code is falsy, so should not call exchangeCodeForSession
			expect(mockLocals.supabase.auth.exchangeCodeForSession).not.toHaveBeenCalled();
		});

		it('should URL decode next parameter correctly', async () => {
			const mockExchangeCodeForSession = vi.fn().mockResolvedValue({ error: null });
			const mockUrl = new URL(
				'http://localhost:5173/auth/callback?code=test-code&next=%2Fevents%2F123'
			);

			const mockLocals = {
				supabase: {
					auth: {
						exchangeCodeForSession: mockExchangeCodeForSession
					}
				}
			};

			try {
				await GET({
					url: mockUrl,
					// @ts-expect-error - Partial mock of locals for testing
					locals: mockLocals
				});
			} catch (error: any) {
				expect(error.status).toBe(303);
				expect(error.location).toBe('/events/123');
			}
		});
	});
});
