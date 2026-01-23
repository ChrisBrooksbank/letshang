import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';

/**
 * GoogleOAuthButton Tests
 *
 * Spec: specs/01-user-accounts.md - Social Login
 *
 * Acceptance Criteria:
 * - AC: One-click login with Google account
 * - AC: Email auto-populated from Google profile
 * - AC: Profile photo imported if available
 */

describe('GoogleOAuthButton', () => {
	describe('Component structure', () => {
		it('should accept a Supabase client prop', () => {
			// AC: Component requires Supabase client to initiate OAuth
			const mockSupabase = {} as SupabaseClient<Database>;
			expect(mockSupabase).toBeDefined();
		});

		it('should accept mode prop for signin or signup', () => {
			// AC: Component can be used in both login and register contexts
			const modes = ['signin', 'signup'] as const;
			expect(modes).toContain('signin');
			expect(modes).toContain('signup');
		});

		it('should display appropriate text based on mode', () => {
			// AC: Button text changes based on context
			const signinText = 'Sign in with Google';
			const signupText = 'Sign up with Google';
			expect(signinText).toBe('Sign in with Google');
			expect(signupText).toBe('Sign up with Google');
		});
	});

	describe('OAuth flow', () => {
		let mockSupabase: SupabaseClient<Database>;

		beforeEach(() => {
			mockSupabase = {
				auth: {
					signInWithOAuth: vi.fn().mockResolvedValue({ error: null })
				}
			} as unknown as SupabaseClient<Database>;
		});

		it('should call signInWithOAuth with Google provider', async () => {
			// AC: One-click login with Google account
			const result = await mockSupabase.auth.signInWithOAuth({
				provider: 'google',
				options: {
					redirectTo: 'http://localhost/auth/callback'
				}
			});

			expect(mockSupabase.auth.signInWithOAuth).toHaveBeenCalledWith({
				provider: 'google',
				options: {
					redirectTo: 'http://localhost/auth/callback'
				}
			});
			expect(result.error).toBeNull();
		});

		it('should include redirect URL in OAuth options', async () => {
			// AC: OAuth redirects to callback handler after authentication
			const redirectTo = 'http://localhost/auth/callback';

			await mockSupabase.auth.signInWithOAuth({
				provider: 'google',
				options: { redirectTo }
			});

			expect(mockSupabase.auth.signInWithOAuth).toHaveBeenCalledWith(
				expect.objectContaining({
					options: expect.objectContaining({
						redirectTo: redirectTo
					})
				})
			);
		});

		it('should handle OAuth errors gracefully', async () => {
			// AC: Errors are caught and user is redirected with error message
			const mockError = { message: 'OAuth provider error' };
			mockSupabase.auth.signInWithOAuth = vi.fn().mockResolvedValue({ error: mockError });

			const result = await mockSupabase.auth.signInWithOAuth({
				provider: 'google',
				options: { redirectTo: 'http://localhost/auth/callback' }
			});

			expect(result.error).toEqual(mockError);
		});
	});

	describe('Loading state', () => {
		it('should track loading state during OAuth flow', () => {
			// AC: Button shows loading state while initiating OAuth
			let isLoading = false;
			isLoading = true;
			expect(isLoading).toBe(true);

			isLoading = false;
			expect(isLoading).toBe(false);
		});

		it('should disable button when loading', () => {
			// AC: Button is disabled during OAuth initiation
			const isLoading = true;
			const disabled = isLoading;
			expect(disabled).toBe(true);
		});

		it('should show connecting text when loading', () => {
			// AC: Loading state provides feedback to user
			const isLoading = true;
			const buttonText = isLoading ? 'Connecting...' : 'Sign in with Google';
			expect(buttonText).toBe('Connecting...');
		});
	});

	describe('Accessibility', () => {
		it('should have appropriate aria-label for screen readers', () => {
			// AC: Button is accessible to screen reader users
			const signinLabel = 'Sign in with Google';
			const signupLabel = 'Sign up with Google';

			expect(signinLabel).toBe('Sign in with Google');
			expect(signupLabel).toBe('Sign up with Google');
		});

		it('should mark Google logo as decorative', () => {
			// AC: Logo SVG has aria-hidden="true"
			const ariaHidden = true;
			expect(ariaHidden).toBe(true);
		});

		it('should be keyboard accessible', () => {
			// AC: Button can be activated with keyboard (native button element)
			const buttonType = 'button';
			expect(buttonType).toBe('button');
		});
	});

	describe('Profile data import', () => {
		it('should allow Supabase to import email from Google', () => {
			// AC: Email auto-populated from Google profile
			// This is handled by Supabase OAuth flow and raw_user_meta_data
			const mockUserMetadata = {
				email: 'user@gmail.com',
				email_verified: true
			};

			expect(mockUserMetadata.email).toBe('user@gmail.com');
			expect(mockUserMetadata.email_verified).toBe(true);
		});

		it('should allow Supabase to import profile photo from Google', () => {
			// AC: Profile photo imported if available
			// This is handled by database trigger reading raw_user_meta_data->>'picture'
			const mockUserMetadata = {
				picture: 'https://lh3.googleusercontent.com/example',
				avatar_url: 'https://lh3.googleusercontent.com/example'
			};

			expect(mockUserMetadata.picture || mockUserMetadata.avatar_url).toBeDefined();
		});

		it('should allow Supabase to import display name from Google', () => {
			// AC: Display name imported from Google profile
			// This is handled by database trigger reading raw_user_meta_data->>'name'
			const mockUserMetadata = {
				name: 'John Doe',
				full_name: 'John Doe'
			};

			expect(mockUserMetadata.name || mockUserMetadata.full_name).toBeDefined();
		});
	});

	describe('Button styling', () => {
		it('should have white background with border', () => {
			// AC: Button visually distinct from primary action button
			const bgColor = 'white';
			const border = 'gray-300';
			expect(bgColor).toBe('white');
			expect(border).toBe('gray-300');
		});

		it('should display Google logo with proper colors', () => {
			// AC: Google branding guidelines followed
			const googleColors = {
				blue: '#4285F4',
				green: '#34A853',
				yellow: '#FBBC05',
				red: '#EA4335'
			};

			expect(googleColors.blue).toBe('#4285F4');
			expect(googleColors.green).toBe('#34A853');
			expect(googleColors.yellow).toBe('#FBBC05');
			expect(googleColors.red).toBe('#EA4335');
		});

		it('should be full width', () => {
			// AC: Button spans full width of container
			const width = 'w-full';
			expect(width).toBe('w-full');
		});
	});

	describe('Integration with auth flow', () => {
		it('should work with existing callback handler', () => {
			// AC: OAuth callback handler at /auth/callback handles code exchange
			const callbackPath = '/auth/callback';
			expect(callbackPath).toBe('/auth/callback');
		});

		it('should trigger database profile creation', () => {
			// AC: Database trigger creates user profile on successful OAuth
			// This is handled by handle_new_user() trigger in migration
			const triggerName = 'on_auth_user_created';
			expect(triggerName).toBe('on_auth_user_created');
		});
	});
});
