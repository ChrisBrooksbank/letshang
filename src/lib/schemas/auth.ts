import { z } from 'zod';

/**
 * Email validation schema
 * - Must be valid email format
 * - Converted to lowercase for consistency
 */
const emailSchema = z.string().email('Please enter a valid email address').toLowerCase();

/**
 * Password validation schema
 * - Minimum 8 characters
 * - No maximum length (let bcrypt handle hashing limits)
 */
const passwordSchema = z.string().min(8, 'Password must be at least 8 characters');

/**
 * Registration form schema
 * Validates email format and password strength
 */
export const registrationSchema = z.object({
	email: emailSchema,
	password: passwordSchema
});

/**
 * TypeScript type for registration form data
 * Exported for use in form handlers and components
 */
export type RegistrationSchema = z.infer<typeof registrationSchema>;

/**
 * Password reset request schema
 * Used for requesting a password reset link
 * Note: Email is normalized to lowercase in the action handler
 */
export const passwordResetRequestSchema = z.object({
	email: z.string().email('Please enter a valid email address')
});

/**
 * TypeScript type for password reset request form
 */
export type PasswordResetRequestSchema = z.infer<typeof passwordResetRequestSchema>;

/**
 * Password reset schema
 * Used when user sets new password via reset link
 * - Requires password confirmation to prevent typos
 * - Password matching is validated in the refine step
 */
export const passwordResetSchema = z
	.object({
		password: z.string().min(8, 'Password must be at least 8 characters'),
		confirmPassword: z.string().min(8, 'Password must be at least 8 characters')
	})
	.superRefine((data, ctx) => {
		if (data.password !== data.confirmPassword) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'Passwords do not match',
				path: ['confirmPassword']
			});
		}
	});

/**
 * TypeScript type for password reset form
 */
export type PasswordResetSchema = z.infer<typeof passwordResetSchema>;
