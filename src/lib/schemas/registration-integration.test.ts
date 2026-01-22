import { describe, it, expect } from 'vitest';
import { registrationSchema, type RegistrationSchema } from './auth';

/**
 * Integration tests for registration form validation
 * These tests validate the complete registration flow scenarios
 */
describe('registration integration', () => {
	describe('happy path scenarios', () => {
		it('should accept valid registration with standard email', () => {
			const testData: RegistrationSchema = {
				email: 'john@example.com',
				password: 'securePassword123'
			};
			const result = registrationSchema.safeParse(testData);

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.email).toBe('john@example.com');
				expect(result.data.password).toBe('securePassword123');
			}
		});

		it('should accept valid registration with complex email', () => {
			const result = registrationSchema.safeParse({
				email: 'jane.doe+test@example.co.uk',
				password: 'myVeryLongAndSecurePassword!@#123'
			});

			expect(result.success).toBe(true);
		});

		it('should normalize email case', () => {
			const result = registrationSchema.safeParse({
				email: 'USER@EXAMPLE.COM',
				password: 'password123'
			});

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.email).toBe('user@example.com');
			}
		});
	});

	describe('error scenarios', () => {
		it('should reject registration with weak password', () => {
			const result = registrationSchema.safeParse({
				email: 'user@example.com',
				password: 'short'
			});

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues).toHaveLength(1);
				expect(result.error.issues[0].path).toContain('password');
				expect(result.error.issues[0].message).toContain('8');
			}
		});

		it('should reject registration with invalid email', () => {
			const result = registrationSchema.safeParse({
				email: 'not-an-email',
				password: 'password123'
			});

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues).toHaveLength(1);
				expect(result.error.issues[0].path).toContain('email');
			}
		});

		it('should reject registration with missing fields', () => {
			const result = registrationSchema.safeParse({});

			expect(result.success).toBe(false);
			if (!result.success) {
				// Should have errors for both email and password
				expect(result.error.issues.length).toBeGreaterThanOrEqual(2);
			}
		});

		it('should reject registration with empty password', () => {
			const result = registrationSchema.safeParse({
				email: 'user@example.com',
				password: ''
			});

			expect(result.success).toBe(false);
			if (!result.success) {
				const passwordError = result.error.issues.find((issue) => issue.path.includes('password'));
				expect(passwordError).toBeDefined();
			}
		});

		it('should reject registration with empty email', () => {
			const result = registrationSchema.safeParse({
				email: '',
				password: 'password123'
			});

			expect(result.success).toBe(false);
			if (!result.success) {
				const emailError = result.error.issues.find((issue) => issue.path.includes('email'));
				expect(emailError).toBeDefined();
			}
		});
	});

	describe('edge cases', () => {
		it('should accept minimum length password', () => {
			const result = registrationSchema.safeParse({
				email: 'user@example.com',
				password: '12345678' // Exactly 8 characters
			});

			expect(result.success).toBe(true);
		});

		it('should reject password with 7 characters', () => {
			const result = registrationSchema.safeParse({
				email: 'user@example.com',
				password: '1234567' // Exactly 7 characters
			});

			expect(result.success).toBe(false);
		});

		it('should accept very long password', () => {
			const result = registrationSchema.safeParse({
				email: 'user@example.com',
				password: 'a'.repeat(200)
			});

			expect(result.success).toBe(true);
		});

		it('should handle special characters in email', () => {
			const result = registrationSchema.safeParse({
				email: 'test+123@example.com',
				password: 'password123'
			});

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.email).toBe('test+123@example.com');
			}
		});
	});
});
