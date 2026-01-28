/**
 * Server functions for user block management
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { BlockedUser } from '$lib/schemas/blocks';

/**
 * Block a user. Prevents all contact between blocker and blocked user.
 * @param supabase - Supabase client (authenticated as the blocker)
 * @param blockedId - UUID of the user to block
 * @param reason - Optional reason for blocking
 * @returns The created block record
 * @throws Error if blocking self, already blocked, or database error
 */
export async function blockUser(
	supabase: SupabaseClient,
	blockedId: string,
	reason?: string
): Promise<{ id: string; blocker_id: string; blocked_id: string; blocked_at: string }> {
	const session = await supabase.auth.getSession();
	const blockerId = session.data.session?.user.id;

	if (!blockerId) {
		throw new Error('User must be authenticated to block');
	}

	if (blockerId === blockedId) {
		throw new Error('Cannot block yourself');
	}

	const { data, error } = await supabase
		.from('user_blocks')
		.insert({
			blocker_id: blockerId,
			blocked_id: blockedId,
			reason: reason ?? null
		})
		.select('id, blocker_id, blocked_id, blocked_at')
		.single();

	if (error) {
		if (error.code === '23505') {
			throw new Error('User is already blocked');
		}
		throw new Error(`Failed to block user: ${error.message}`);
	}

	return data;
}

/**
 * Unblock a previously blocked user.
 * @param supabase - Supabase client (authenticated as the blocker)
 * @param blockedId - UUID of the user to unblock
 * @throws Error if block not found or database error
 */
export async function unblockUser(supabase: SupabaseClient, blockedId: string): Promise<void> {
	const session = await supabase.auth.getSession();
	const blockerId = session.data.session?.user.id;

	if (!blockerId) {
		throw new Error('User must be authenticated to unblock');
	}

	// Verify the block exists before attempting deletion
	const { data: existingBlock } = await supabase
		.from('user_blocks')
		.select('id')
		.eq('blocker_id', blockerId)
		.eq('blocked_id', blockedId)
		.single();

	if (!existingBlock) {
		throw new Error('User was not blocked');
	}

	const { error } = await supabase
		.from('user_blocks')
		.delete()
		.eq('blocker_id', blockerId)
		.eq('blocked_id', blockedId);

	if (error) {
		throw new Error(`Failed to unblock user: ${error.message}`);
	}
}

/**
 * Get all users blocked by the current user, with display names.
 * @param supabase - Supabase client (authenticated)
 * @returns Array of blocked user entries with display info
 */
export async function getBlockedUsers(supabase: SupabaseClient): Promise<BlockedUser[]> {
	const session = await supabase.auth.getSession();
	const userId = session.data.session?.user.id;

	if (!userId) {
		throw new Error('User must be authenticated');
	}

	const { data, error } = await supabase
		.from('user_blocks')
		.select(
			`
			id,
			blocked_id,
			reason,
			blocked_at,
			users!user_blocks_blocked_id_fkey(display_name)
		`
		)
		.eq('blocker_id', userId)
		.order('blocked_at', { ascending: false });

	if (error) {
		throw new Error(`Failed to fetch blocked users: ${error.message}`);
	}

	return data.map((row) => {
		const user = row.users as unknown as { display_name: string | null } | null;
		return {
			id: row.id,
			blockedId: row.blocked_id,
			displayName: user?.display_name ?? null,
			reason: row.reason,
			blockedAt: row.blocked_at
		};
	});
}

/**
 * Check if the current user has blocked a specific user.
 * @param supabase - Supabase client (authenticated)
 * @param targetUserId - UUID of the user to check
 * @returns true if the current user has blocked the target user
 */
export async function isUserBlocked(
	supabase: SupabaseClient,
	targetUserId: string
): Promise<boolean> {
	const session = await supabase.auth.getSession();
	const userId = session.data.session?.user.id;

	if (!userId) {
		return false;
	}

	const { count, error } = await supabase
		.from('user_blocks')
		.select('id', { count: 'exact', head: true })
		.eq('blocker_id', userId)
		.eq('blocked_id', targetUserId);

	if (error) {
		return false;
	}

	return (count ?? 0) > 0;
}
