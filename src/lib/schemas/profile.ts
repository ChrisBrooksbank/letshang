import { z } from 'zod';

/**
 * Profile visibility options
 * - public: Anyone can view the profile
 * - members_only: Only authenticated users can view
 * - connections_only: Only direct connections can view (future feature)
 */
export const profileVisibilitySchema = z.enum(['public', 'members_only', 'connections_only']);

/**
 * TypeScript type for profile visibility
 * TODO: Will be used in future iteration for profile visibility settings
 */
// export type ProfileVisibility = z.infer<typeof profileVisibilitySchema>;

/**
 * Display name validation schema
 * - Minimum 2 characters
 * - Maximum 50 characters
 */
const displayNameSchema = z
	.string()
	.min(2, 'Display name must be at least 2 characters')
	.max(50, 'Display name must be at most 50 characters');

/**
 * Bio validation schema
 * - Maximum 500 characters
 * - Optional field
 */
const bioSchema = z.string().max(500, 'Bio must be at most 500 characters').optional();

/**
 * Location validation schema
 * - Optional field for city/area
 */
const locationSchema = z.string().optional();

/**
 * Profile update schema
 * Validates all editable profile fields
 * Used for the profile editing form
 */
export const profileUpdateSchema = z.object({
	displayName: displayNameSchema,
	bio: bioSchema,
	location: locationSchema
});

/**
 * TypeScript type for profile update form data
 * Exported for use in form handlers and components
 */
export type ProfileUpdateSchema = z.infer<typeof profileUpdateSchema>;

/**
 * Profile visibility update schema
 * Separate schema for updating just the visibility setting
 * TODO: Will be used in future iteration for profile visibility settings
 */
// export const profileVisibilityUpdateSchema = z.object({
// 	profileVisibility: profileVisibilitySchema
// });

// export type ProfileVisibilityUpdateSchema = z.infer<typeof profileVisibilityUpdateSchema>;
