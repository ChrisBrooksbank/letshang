/**
 * Database Types
 *
 * This file contains TypeScript types generated from the Supabase database schema.
 * These types ensure type safety when querying and mutating database records.
 *
 * To regenerate these types after schema changes:
 * 1. Ensure your .env file has valid Supabase credentials
 * 2. Run: pnpm db:types
 *
 * This will fetch the latest schema from your Supabase project and update this file.
 */

/**
 * Database schema structure
 * This will be populated by the db:types script from your Supabase project
 */
export interface Database {
	public: {
		Tables: Record<string, never>;
		Views: Record<string, never>;
		Functions: Record<string, never>;
		Enums: Record<string, never>;
	};
}

/**
 * Helper type for extracting table row types
 * Usage: type User = Tables<'users'>
 */
export type Tables<T extends keyof Database['public']['Tables']> =
	Database['public']['Tables'][T]['Row'];

/**
 * Helper type for extracting table insert types
 * Usage: type UserInsert = TablesInsert<'users'>
 */
export type TablesInsert<T extends keyof Database['public']['Tables']> =
	Database['public']['Tables'][T]['Insert'];

/**
 * Helper type for extracting table update types
 * Usage: type UserUpdate = TablesUpdate<'users'>
 */
export type TablesUpdate<T extends keyof Database['public']['Tables']> =
	Database['public']['Tables'][T]['Update'];
