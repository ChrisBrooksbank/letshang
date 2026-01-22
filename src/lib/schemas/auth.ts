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
