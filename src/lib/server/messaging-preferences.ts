/**
 * Server functions for messaging preference management
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { DmPermission, MessagingPreference } from '$lib/schemas/messaging-preferences';

/**
 * Fetch the current user's messaging preferences.
 * Returns default (anyone) if no preference has been set.
 * @param supabase - Supabase client (authenticated)
 * @returns The user's current messaging preference
 */
export async function fetchMessagingPreference(
	supabase: SupabaseClient
): Promise<MessagingPreference> {
	const session = await supabase.auth.getSession();
	const userId = session.data.session?.user.id;

	if (!userId) {
		throw new Error('User must be authenticated');
	}

	const { data, error } = await supabase
		.from('messaging_preferences')
		.select('allow_dm_from')
		.eq('user_id', userId)
		.single();

	if (error) {
		// If no preference exists, return default
		if (error.code === 'PGRST116') {
			return { allowDmFrom: 'anyone' };
		}
		throw new Error(`Failed to fetch messaging preferences: ${error.message}`);
	}

	return {
		allowDmFrom: data.allow_dm_from as DmPermission
	};
}

/**
 * Update the current user's DM permission setting.
 * Creates a preference row if one does not exist (upsert).
 * @param supabase - Supabase client (authenticated)
 * @param allowDmFrom - The new DM permission level
 * @returns The updated preference
 */
export async function updateMessagingPreference(
	supabase: SupabaseClient,
	allowDmFrom: DmPermission
): Promise<MessagingPreference> {
	const session = await supabase.auth.getSession();
	const userId = session.data.session?.user.id;

	if (!userId) {
		throw new Error('User must be authenticated');
	}

	const { data, error } = await supabase
		.from('messaging_preferences')
		.upsert(
			{
				user_id: userId,
				allow_dm_from: allowDmFrom
			},
			{
				onConflict: 'user_id'
			}
		)
		.select('allow_dm_from')
		.single();

	if (error) {
		throw new Error(`Failed to update messaging preferences: ${error.message}`);
	}

	return {
		allowDmFrom: data.allow_dm_from as DmPermission
	};
}
