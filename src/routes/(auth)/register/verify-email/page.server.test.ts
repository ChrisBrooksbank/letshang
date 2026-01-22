import { describe, it, expect, vi, beforeEach } from 'vitest';
import { actions } from './+page.server.js';

describe('verify-email page server actions', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('resend action', () => {
		it('should resend verification email successfully', async () => {
			const mockResend = vi.fn().mockResolvedValue({ error: null });
			const mockFormData = new FormData();
			mockFormData.set('email', 'test@example.com');

			const mockRequest = {
				formData: async () => mockFormData,
				headers: {
					get: (name: string) => {
						if (name === 'origin') return 'http://localhost:5173';
						return null;
					}
				}
			};

			const mockLocals = {
				supabase: {
					auth: {
						resend: mockResend
					}
				}
			};

			const result = await (actions.resend as any)({
				request: mockRequest,
				locals: mockLocals
			});

			expect(mockResend).toHaveBeenCalledWith({
				type: 'signup',
				email: 'test@example.com',
				options: {
					emailRedirectTo: 'http://localhost:5173/auth/callback'
				}
			});

			expect(result).toEqual({
				success: true,
				message: 'Verification email resent successfully'
			});
		});

		it('should return error when email is missing', async () => {
			const mockFormData = new FormData();
			// No email set

			const mockRequest = {
				formData: async () => mockFormData
			};

			const mockLocals = {
				supabase: {
					auth: {
						resend: vi.fn()
					}
				}
			};

			const result = await (actions.resend as any)({
				request: mockRequest,
				locals: mockLocals
			});

			expect(result).toMatchObject({
				status: 400,
				data: {
					error: 'Email is required'
				}
			});

			expect(mockLocals.supabase.auth.resend).not.toHaveBeenCalled();
		});

		it('should return error when email is empty string', async () => {
			const mockFormData = new FormData();
			mockFormData.set('email', '');

			const mockRequest = {
				formData: async () => mockFormData
			};

			const mockLocals = {
				supabase: {
					auth: {
						resend: vi.fn()
					}
				}
			};

			const result = await (actions.resend as any)({
				request: mockRequest,
				locals: mockLocals
			});

			expect(result).toMatchObject({
				status: 400,
				data: {
					error: 'Email is required'
				}
			});

			expect(mockLocals.supabase.auth.resend).not.toHaveBeenCalled();
		});

		it('should return generic error when resend fails', async () => {
			const mockError = { message: 'Rate limit exceeded', status: 429 };
			const mockResend = vi.fn().mockResolvedValue({ error: mockError });
			const mockFormData = new FormData();
			mockFormData.set('email', 'test@example.com');

			const mockRequest = {
				formData: async () => mockFormData,
				headers: {
					get: (name: string) => {
						if (name === 'origin') return 'http://localhost:5173';
						return null;
					}
				}
			};

			const mockLocals = {
				supabase: {
					auth: {
						resend: mockResend
					}
				}
			};

			const result = await (actions.resend as any)({
				request: mockRequest,
				locals: mockLocals
			});

			expect(result).toMatchObject({
				status: 500,
				data: {
					error: 'Failed to resend verification email. Please try again.'
				}
			});

			expect(mockResend).toHaveBeenCalled();
		});

		it('should not reveal if email exists (anti-enumeration)', async () => {
			const mockError = { message: 'User not found', status: 404 };
			const mockResend = vi.fn().mockResolvedValue({ error: mockError });
			const mockFormData = new FormData();
			mockFormData.set('email', 'nonexistent@example.com');

			const mockRequest = {
				formData: async () => mockFormData,
				headers: {
					get: (name: string) => {
						if (name === 'origin') return 'http://localhost:5173';
						return null;
					}
				}
			};

			const mockLocals = {
				supabase: {
					auth: {
						resend: mockResend
					}
				}
			};

			const result = await (actions.resend as any)({
				request: mockRequest,
				locals: mockLocals
			});

			// Should return the same generic error, not revealing if email exists
			expect(result).toMatchObject({
				status: 500,
				data: {
					error: 'Failed to resend verification email. Please try again.'
				}
			});
		});

		it('should use correct redirect URL in production', async () => {
			const mockResend = vi.fn().mockResolvedValue({ error: null });
			const mockFormData = new FormData();
			mockFormData.set('email', 'test@example.com');

			const mockRequest = {
				formData: async () => mockFormData,
				headers: {
					get: (name: string) => {
						if (name === 'origin') return 'https://letshang.com';
						return null;
					}
				}
			};

			const mockLocals = {
				supabase: {
					auth: {
						resend: mockResend
					}
				}
			};

			await (actions.resend as any)({
				request: mockRequest,
				locals: mockLocals
			});

			expect(mockResend).toHaveBeenCalledWith({
				type: 'signup',
				email: 'test@example.com',
				options: {
					emailRedirectTo: 'https://letshang.com/auth/callback'
				}
			});
		});
	});
});
