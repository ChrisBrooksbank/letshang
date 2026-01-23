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
		Tables: {
			users: {
				Row: {
					id: string;
					display_name: string | null;
					bio: string | null;
					profile_photo_url: string | null;
					location: string | null;
					profile_visibility: 'public' | 'members_only' | 'connections_only';
					created_at: string;
					updated_at: string;
				};
				Insert: {
					id: string;
					display_name?: string | null;
					bio?: string | null;
					profile_photo_url?: string | null;
					location?: string | null;
					profile_visibility?: 'public' | 'members_only' | 'connections_only';
					created_at?: string;
					updated_at?: string;
				};
				Update: {
					id?: string;
					display_name?: string | null;
					bio?: string | null;
					profile_photo_url?: string | null;
					location?: string | null;
					profile_visibility?: 'public' | 'members_only' | 'connections_only';
					created_at?: string;
					updated_at?: string;
				};
			};
			events: {
				Row: {
					id: string;
					creator_id: string;
					title: string;
					description: string | null;
					start_time: string;
					end_time: string | null;
					event_type: 'in_person' | 'online' | 'hybrid';
					venue_name: string | null;
					venue_address: string | null;
					created_at: string;
					updated_at: string;
				};
				Insert: {
					id?: string;
					creator_id: string;
					title: string;
					description?: string | null;
					start_time: string;
					end_time?: string | null;
					event_type: 'in_person' | 'online' | 'hybrid';
					venue_name?: string | null;
					venue_address?: string | null;
					created_at?: string;
					updated_at?: string;
				};
				Update: {
					id?: string;
					creator_id?: string;
					title?: string;
					description?: string | null;
					start_time?: string;
					end_time?: string | null;
					event_type?: 'in_person' | 'online' | 'hybrid';
					venue_name?: string | null;
					venue_address?: string | null;
					created_at?: string;
					updated_at?: string;
				};
			};
			event_rsvps: {
				Row: {
					id: string;
					event_id: string;
					user_id: string;
					status: 'going' | 'interested' | 'not_going';
					created_at: string;
					updated_at: string;
				};
				Insert: {
					id?: string;
					event_id: string;
					user_id: string;
					status: 'going' | 'interested' | 'not_going';
					created_at?: string;
					updated_at?: string;
				};
				Update: {
					id?: string;
					event_id?: string;
					user_id?: string;
					status?: 'going' | 'interested' | 'not_going';
					created_at?: string;
					updated_at?: string;
				};
			};
			topics: {
				Row: {
					id: string;
					name: string;
					slug: string;
					description: string | null;
					category: string | null;
					created_at: string;
					updated_at: string;
				};
				Insert: {
					id?: string;
					name: string;
					slug: string;
					description?: string | null;
					category?: string | null;
					created_at?: string;
					updated_at?: string;
				};
				Update: {
					id?: string;
					name?: string;
					slug?: string;
					description?: string | null;
					category?: string | null;
					created_at?: string;
					updated_at?: string;
				};
			};
			groups: {
				Row: {
					id: string;
					name: string;
					description: string | null;
					cover_image_url: string | null;
					group_type: 'public' | 'private';
					location: string | null;
					organizer_id: string;
					created_at: string;
					updated_at: string;
				};
				Insert: {
					id?: string;
					name: string;
					description?: string | null;
					cover_image_url?: string | null;
					group_type?: 'public' | 'private';
					location?: string | null;
					organizer_id: string;
					created_at?: string;
					updated_at?: string;
				};
				Update: {
					id?: string;
					name?: string;
					description?: string | null;
					cover_image_url?: string | null;
					group_type?: 'public' | 'private';
					location?: string | null;
					organizer_id?: string;
					created_at?: string;
					updated_at?: string;
				};
			};
			group_topics: {
				Row: {
					group_id: string;
					topic_id: string;
					created_at: string;
				};
				Insert: {
					group_id: string;
					topic_id: string;
					created_at?: string;
				};
				Update: {
					group_id?: string;
					topic_id?: string;
					created_at?: string;
				};
			};
			group_members: {
				Row: {
					id: string;
					group_id: string;
					user_id: string;
					role: 'organizer' | 'co_organizer' | 'assistant_organizer' | 'event_organizer' | 'member';
					status: 'active' | 'pending' | 'banned';
					join_request_message: string | null;
					joined_at: string;
					updated_at: string;
				};
				Insert: {
					id?: string;
					group_id: string;
					user_id: string;
					role?:
						| 'organizer'
						| 'co_organizer'
						| 'assistant_organizer'
						| 'event_organizer'
						| 'member';
					status?: 'active' | 'pending' | 'banned';
					join_request_message?: string | null;
					joined_at?: string;
					updated_at?: string;
				};
				Update: {
					id?: string;
					group_id?: string;
					user_id?: string;
					role?:
						| 'organizer'
						| 'co_organizer'
						| 'assistant_organizer'
						| 'event_organizer'
						| 'member';
					status?: 'active' | 'pending' | 'banned';
					join_request_message?: string | null;
					joined_at?: string;
					updated_at?: string;
				};
			};
		};
		Views: Record<string, never>;
		Functions: Record<string, never>;
		Enums: {
			profile_visibility: 'public' | 'members_only' | 'connections_only';
			event_type: 'in_person' | 'online' | 'hybrid';
			rsvp_status: 'going' | 'interested' | 'not_going';
			group_type: 'public' | 'private';
			group_member_role:
				| 'organizer'
				| 'co_organizer'
				| 'assistant_organizer'
				| 'event_organizer'
				| 'member';
		};
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
