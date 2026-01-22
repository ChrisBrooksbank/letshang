import { describe, it, expect } from 'vitest';
import {
	registrationSchema,
	passwordResetRequestSchema,
	passwordResetSchema,
	loginSchema
} from './auth';

describe('registrationSchema', () => {
	describe('email validation', () => {
		it('should accept valid email addresses', () => {
			const validEmails = [
				'user@example.com',
				'test.user@example.com',
				'user+tag@example.co.uk',
				'user123@test-domain.com'
			];

			validEmails.forEach((email) => {
				const result = registrationSchema.safeParse({
					email,
					password: 'password123'
				});
				expect(result.success).toBe(true);
			});
		});

		it('should normalize email to lowercase', () => {
			const result = registrationSchema.parse({
				email: 'USER@EXAMPLE.COM',
				password: 'password123'
			});
			expect(result.email).toBe('user@example.com');
		});

		it('should reject invalid email formats', () => {
			const invalidEmails = [
				'notanemail',
				'@example.com',
				'user@',
				'user @example.com',
				'user@example',
				''
			];

			invalidEmails.forEach((email) => {
				const result = registrationSchema.safeParse({
					email,
					password: 'password123'
				});
				expect(result.success).toBe(false);
				if (!result.success) {
					expect(result.error.issues[0].message).toContain('valid email');
				}
			});
		});
	});

	describe('password validation', () => {
		it('should accept passwords with 8 or more characters', () => {
			const validPasswords = [
				'12345678',
				'password',
				'abcdefgh',
				'mysecurepassword123!@#',
				'        ' // 8 spaces - technically valid, server should handle
			];

			validPasswords.forEach((password) => {
				const result = registrationSchema.safeParse({
					email: 'user@example.com',
					password
				});
				expect(result.success).toBe(true);
			});
		});

		it('should reject passwords with fewer than 8 characters', () => {
			const invalidPasswords = ['', '1', '12', '123', '1234', '12345', '123456', '1234567'];

			invalidPasswords.forEach((password) => {
				const result = registrationSchema.safeParse({
					email: 'user@example.com',
					password
				});
				expect(result.success).toBe(false);
				if (!result.success) {
					expect(result.error.issues[0].message).toContain('at least 8 characters');
				}
			});
		});

		it('should accept very long passwords', () => {
			// Test with 100 character password
			const longPassword = 'a'.repeat(100);
			const result = registrationSchema.safeParse({
				email: 'user@example.com',
				password: longPassword
			});
			expect(result.success).toBe(true);
		});
	});

	describe('complete form validation', () => {
		it('should require both email and password', () => {
			const result = registrationSchema.safeParse({});
			expect(result.success).toBe(false);
		});

		it('should reject when only email is provided', () => {
			const result = registrationSchema.safeParse({
				email: 'user@example.com'
			});
			expect(result.success).toBe(false);
		});

		it('should reject when only password is provided', () => {
			const result = registrationSchema.safeParse({
				password: 'password123'
			});
			expect(result.success).toBe(false);
		});

		it('should accept valid complete form data', () => {
			const result = registrationSchema.safeParse({
				email: 'user@example.com',
				password: 'password123'
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data).toEqual({
					email: 'user@example.com',
					password: 'password123'
				});
			}
		});
	});
});

describe('passwordResetRequestSchema', () => {
	describe('email validation', () => {
		it('should accept valid email addresses', () => {
			const validEmails = [
				'user@example.com',
				'test.user@example.com',
				'user+tag@example.co.uk',
				'user123@test-domain.com'
			];

			validEmails.forEach((email) => {
				const result = passwordResetRequestSchema.safeParse({ email });
				expect(result.success).toBe(true);
			});
		});

		it('should accept uppercase email addresses', () => {
			// Note: Email normalization is now handled in the server action
			const result = passwordResetRequestSchema.safeParse({
				email: 'USER@EXAMPLE.COM'
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.email).toBe('USER@EXAMPLE.COM');
			}
		});

		it('should reject invalid email formats', () => {
			const invalidEmails = ['notanemail', '@example.com', 'user@', 'user@example', ''];

			invalidEmails.forEach((email) => {
				const result = passwordResetRequestSchema.safeParse({ email });
				expect(result.success).toBe(false);
				if (!result.success) {
					expect(result.error.issues[0].message).toContain('valid email');
				}
			});
		});

		it('should require email field', () => {
			const result = passwordResetRequestSchema.safeParse({});
			expect(result.success).toBe(false);
		});
	});
});

describe('passwordResetSchema', () => {
	describe('password validation', () => {
		it('should accept matching passwords with 8+ characters', () => {
			const result = passwordResetSchema.safeParse({
				password: 'password123',
				confirmPassword: 'password123'
			});
			expect(result.success).toBe(true);
		});

		it('should reject passwords shorter than 8 characters', () => {
			const result = passwordResetSchema.safeParse({
				password: 'short',
				confirmPassword: 'short'
			});
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0].message).toContain('at least 8 characters');
			}
		});

		it('should reject non-matching passwords', () => {
			const result = passwordResetSchema.safeParse({
				password: 'password123',
				confirmPassword: 'different123'
			});
			expect(result.success).toBe(false);
			if (!result.success) {
				const matchError = result.error.issues.find(
					(issue) => issue.message === 'Passwords do not match'
				);
				expect(matchError).toBeDefined();
			}
		});

		it('should reject when confirmPassword is missing', () => {
			const result = passwordResetSchema.safeParse({
				password: 'password123'
			});
			expect(result.success).toBe(false);
		});

		it('should reject when password is missing', () => {
			const result = passwordResetSchema.safeParse({
				confirmPassword: 'password123'
			});
			expect(result.success).toBe(false);
		});

		it('should accept very long matching passwords', () => {
			const longPassword = 'a'.repeat(100);
			const result = passwordResetSchema.safeParse({
				password: longPassword,
				confirmPassword: longPassword
			});
			expect(result.success).toBe(true);
		});
	});

	describe('complete form validation', () => {
		it('should require both fields', () => {
			const result = passwordResetSchema.safeParse({});
			expect(result.success).toBe(false);
		});

		it('should accept valid complete form data', () => {
			const result = passwordResetSchema.safeParse({
				password: 'newpassword123',
				confirmPassword: 'newpassword123'
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data).toEqual({
					password: 'newpassword123',
					confirmPassword: 'newpassword123'
				});
			}
		});
	});
});

describe('loginSchema', () => {
	describe('email validation', () => {
		it('should accept valid email addresses', () => {
			const validEmails = [
				'user@example.com',
				'test.user@example.com',
				'user+tag@example.co.uk',
				'user123@test-domain.com'
			];

			validEmails.forEach((email) => {
				const result = loginSchema.safeParse({
					email,
					password: 'password123',
					rememberMe: false
				});
				expect(result.success).toBe(true);
			});
		});

		it('should normalize email to lowercase', () => {
			const result = loginSchema.parse({
				email: 'USER@EXAMPLE.COM',
				password: 'password123',
				rememberMe: false
			});
			expect(result.email).toBe('user@example.com');
		});

		it('should reject invalid email formats', () => {
			const invalidEmails = [
				'notanemail',
				'@example.com',
				'user@',
				'user @example.com',
				'user@example',
				''
			];

			invalidEmails.forEach((email) => {
				const result = loginSchema.safeParse({
					email,
					password: 'password123',
					rememberMe: false
				});
				expect(result.success).toBe(false);
				if (!result.success) {
					expect(result.error.issues[0].message).toContain('valid email');
				}
			});
		});
	});

	describe('password validation', () => {
		it('should accept any non-empty password', () => {
			const validPasswords = ['1', '12', '1234567', '12345678', 'password123', 'a'.repeat(100)];

			validPasswords.forEach((password) => {
				const result = loginSchema.safeParse({
					email: 'user@example.com',
					password,
					rememberMe: false
				});
				expect(result.success).toBe(true);
			});
		});

		it('should reject empty password', () => {
			const result = loginSchema.safeParse({
				email: 'user@example.com',
				password: '',
				rememberMe: false
			});
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0].message).toContain('Password is required');
			}
		});
	});

	describe('rememberMe validation', () => {
		it('should accept true for rememberMe', () => {
			const result = loginSchema.safeParse({
				email: 'user@example.com',
				password: 'password123',
				rememberMe: true
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.rememberMe).toBe(true);
			}
		});

		it('should accept false for rememberMe', () => {
			const result = loginSchema.safeParse({
				email: 'user@example.com',
				password: 'password123',
				rememberMe: false
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.rememberMe).toBe(false);
			}
		});

		it('should default rememberMe to false when not provided', () => {
			const result = loginSchema.parse({
				email: 'user@example.com',
				password: 'password123'
			});
			expect(result.rememberMe).toBe(false);
		});
	});

	describe('complete form validation', () => {
		it('should require email and password', () => {
			const result = loginSchema.safeParse({});
			expect(result.success).toBe(false);
		});

		it('should reject when only email is provided', () => {
			const result = loginSchema.safeParse({
				email: 'user@example.com'
			});
			expect(result.success).toBe(false);
		});

		it('should reject when only password is provided', () => {
			const result = loginSchema.safeParse({
				password: 'password123'
			});
			expect(result.success).toBe(false);
		});

		it('should accept valid complete form data with rememberMe', () => {
			const result = loginSchema.safeParse({
				email: 'user@example.com',
				password: 'password123',
				rememberMe: true
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data).toEqual({
					email: 'user@example.com',
					password: 'password123',
					rememberMe: true
				});
			}
		});

		it('should accept valid form data without rememberMe (defaults to false)', () => {
			const result = loginSchema.safeParse({
				email: 'user@example.com',
				password: 'password123'
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data).toEqual({
					email: 'user@example.com',
					password: 'password123',
					rememberMe: false
				});
			}
		});
	});
});
