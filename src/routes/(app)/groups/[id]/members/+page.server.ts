import { error, fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { supabase } from '$lib/server/supabase';
import {
	updateMemberRoleSchema,
	removeMemberSchema,
	canAssignRole,
	canModifyMember,
	type GroupMemberRole
} from '$lib/schemas/group-members';
import { joinRequestResponseSchema } from '$lib/schemas/groups';

type MemberWithUser = {
	id: string;
	role: string;
	status: string;
	joined_at: string;
	user: {
		id: string;
		display_name: string | null;
		profile_photo_url: string | null;
	} | null;
};

type PendingRequestWithUser = {
	id: string;
	role: string;
	status: string;
	joined_at: string;
	join_request_message: string | null;
	user: {
		id: string;
		display_name: string | null;
		profile_photo_url: string | null;
	} | null;
};

export const load: PageServerLoad = async ({ params, locals }) => {
	const session = locals.session;
	const groupId = params.id;

	if (!session?.user) {
		throw redirect(303, `/login?redirect=/groups/${groupId}/members`);
	}

	if (!groupId) {
		throw error(400, 'Group ID is required');
	}

	// Fetch group details
	const { data: group, error: groupError } = await supabase
		.from('groups')
		.select('id, name, group_type')
		.eq('id', groupId)
		.single();

	if (groupError || !group) {
		throw error(404, 'Group not found');
	}

	// Check current user's membership and role
	const { data: currentUserMembership, error: membershipError } = await supabase
		.from('group_members')
		.select('role, status')
		.eq('group_id', groupId)
		.eq('user_id', session.user.id)
		.eq('status', 'active')
		.single();

	if (membershipError || !currentUserMembership) {
		throw error(403, 'You must be a member of this group to view members');
	}

	const currentUserRole = currentUserMembership.role as GroupMemberRole;

	// Only leadership roles (organizer, co-organizer, assistant organizer) can access this page
	const leadershipRoles: GroupMemberRole[] = ['organizer', 'co_organizer', 'assistant_organizer'];
	if (!leadershipRoles.includes(currentUserRole)) {
		throw error(403, 'Only group leadership can manage members');
	}

	// Fetch all active members with user details
	const { data: members, error: membersError } = await supabase
		.from('group_members')
		.select(
			`
			id,
			role,
			status,
			joined_at,
			user:users!group_members_user_id_fkey(
				id,
				display_name,
				profile_photo_url
			)
		`
		)
		.eq('group_id', groupId)
		.eq('status', 'active')
		.order('joined_at', { ascending: true });

	if (membersError) {
		throw error(500, 'Failed to load members');
	}

	// Count organizers to prevent removing the last one
	const organizerCount = members?.filter((m) => m.role === 'organizer').length || 0;

	// Transform members data to fix Supabase return type (user can be array or object)
	const typedMembers: MemberWithUser[] = (members || []).map((member) => ({
		id: member.id,
		role: member.role,
		status: member.status,
		joined_at: member.joined_at,
		user: Array.isArray(member.user) ? member.user[0] || null : member.user || null
	}));

	// Fetch pending join requests (only for private groups)
	let pendingRequests: PendingRequestWithUser[] = [];
	if (group.group_type === 'private') {
		const { data: requests, error: requestsError } = await supabase
			.from('group_members')
			.select(
				`
				id,
				role,
				status,
				joined_at,
				join_request_message,
				user:users!group_members_user_id_fkey(
					id,
					display_name,
					profile_photo_url
				)
			`
			)
			.eq('group_id', groupId)
			.eq('status', 'pending')
			.order('joined_at', { ascending: true });

		// Silently continue if requests fetch fails
		if (!requestsError && requests) {
			pendingRequests = requests.map((req) => ({
				id: req.id,
				role: req.role,
				status: req.status,
				joined_at: req.joined_at,
				join_request_message: req.join_request_message,
				user: Array.isArray(req.user) ? req.user[0] || null : req.user || null
			}));
		}
	}

	return {
		group,
		members: typedMembers,
		currentUserRole,
		organizerCount,
		pendingRequests
	};
};

export const actions: Actions = {
	updateRole: async ({ params, locals, request }) => {
		const session = locals.session;

		if (!session?.user) {
			throw redirect(303, `/login?redirect=/groups/${params.id}/members`);
		}

		const groupId = params.id;
		if (!groupId) {
			return fail(400, { message: 'Group ID is required' });
		}

		// Parse and validate form data
		const formData = await request.formData();
		const memberId = formData.get('memberId');
		const newRole = formData.get('newRole');

		const validation = updateMemberRoleSchema.safeParse({
			memberId,
			newRole
		});

		if (!validation.success) {
			return fail(400, {
				message: validation.error.issues[0]?.message || 'Invalid input'
			});
		}

		const { memberId: validMemberId, newRole: validNewRole } = validation.data;

		// Check current user's role
		const { data: currentUserMembership, error: membershipError } = await supabase
			.from('group_members')
			.select('role')
			.eq('group_id', groupId)
			.eq('user_id', session.user.id)
			.eq('status', 'active')
			.single();

		if (membershipError || !currentUserMembership) {
			return fail(403, { message: 'You are not a member of this group' });
		}

		const currentUserRole = currentUserMembership.role as GroupMemberRole;

		// Get target member's current role
		const { data: targetMember, error: targetError } = await supabase
			.from('group_members')
			.select('role, user_id')
			.eq('id', validMemberId)
			.eq('group_id', groupId)
			.single();

		if (targetError || !targetMember) {
			return fail(404, { message: 'Member not found' });
		}

		const targetCurrentRole = targetMember.role as GroupMemberRole;

		// Prevent changing your own role
		if (targetMember.user_id === session.user.id) {
			return fail(400, { message: 'You cannot change your own role' });
		}

		// Check if current user can assign the new role
		if (!canAssignRole(currentUserRole, validNewRole)) {
			return fail(403, {
				message: 'You do not have permission to assign this role'
			});
		}

		// Check if current user can modify this member
		if (!canModifyMember(currentUserRole, targetCurrentRole)) {
			return fail(403, {
				message: 'You can only modify members with roles lower than yours'
			});
		}

		// If demoting an organizer, ensure at least one organizer remains
		if (targetCurrentRole === 'organizer' && validNewRole !== 'organizer') {
			const { count: organizerCount } = await supabase
				.from('group_members')
				.select('*', { count: 'exact', head: true })
				.eq('group_id', groupId)
				.eq('role', 'organizer')
				.eq('status', 'active');

			if (organizerCount !== null && organizerCount <= 1) {
				return fail(400, {
					message: 'Cannot remove the last organizer. Promote another member first.'
				});
			}
		}

		// Update the member's role
		const { error: updateError } = await supabase
			.from('group_members')
			.update({ role: validNewRole })
			.eq('id', validMemberId)
			.eq('group_id', groupId);

		if (updateError) {
			return fail(500, { message: 'Failed to update member role' });
		}

		return {
			success: true,
			message: 'Member role updated successfully'
		};
	},

	removeMember: async ({ params, locals, request }) => {
		const session = locals.session;

		if (!session?.user) {
			throw redirect(303, `/login?redirect=/groups/${params.id}/members`);
		}

		const groupId = params.id;
		if (!groupId) {
			return fail(400, { message: 'Group ID is required' });
		}

		// Parse and validate form data
		const formData = await request.formData();
		const memberId = formData.get('memberId');

		const validation = removeMemberSchema.safeParse({ memberId });

		if (!validation.success) {
			return fail(400, {
				message: validation.error.issues[0]?.message || 'Invalid input'
			});
		}

		const { memberId: validMemberId } = validation.data;

		// Check current user's role
		const { data: currentUserMembership, error: membershipError } = await supabase
			.from('group_members')
			.select('role')
			.eq('group_id', groupId)
			.eq('user_id', session.user.id)
			.eq('status', 'active')
			.single();

		if (membershipError || !currentUserMembership) {
			return fail(403, { message: 'You are not a member of this group' });
		}

		const currentUserRole = currentUserMembership.role as GroupMemberRole;

		// Only leadership can remove members
		const leadershipRoles: GroupMemberRole[] = ['organizer', 'co_organizer', 'assistant_organizer'];
		if (!leadershipRoles.includes(currentUserRole)) {
			return fail(403, { message: 'Only group leadership can remove members' });
		}

		// Get target member's details
		const { data: targetMember, error: targetError } = await supabase
			.from('group_members')
			.select('role, user_id')
			.eq('id', validMemberId)
			.eq('group_id', groupId)
			.single();

		if (targetError || !targetMember) {
			return fail(404, { message: 'Member not found' });
		}

		const targetRole = targetMember.role as GroupMemberRole;

		// Prevent removing yourself
		if (targetMember.user_id === session.user.id) {
			return fail(400, { message: 'You cannot remove yourself from the group' });
		}

		// Check if current user can modify this member
		if (!canModifyMember(currentUserRole, targetRole)) {
			return fail(403, {
				message: 'You can only remove members with roles lower than yours'
			});
		}

		// If removing an organizer, ensure at least one remains
		// (This should also be caught by the database trigger, but we check here too)
		if (targetRole === 'organizer') {
			const { count: organizerCount } = await supabase
				.from('group_members')
				.select('*', { count: 'exact', head: true })
				.eq('group_id', groupId)
				.eq('role', 'organizer')
				.eq('status', 'active');

			if (organizerCount !== null && organizerCount <= 1) {
				return fail(400, {
					message: 'Cannot remove the last organizer'
				});
			}
		}

		// Remove the member
		const { error: deleteError } = await supabase
			.from('group_members')
			.delete()
			.eq('id', validMemberId)
			.eq('group_id', groupId);

		if (deleteError) {
			return fail(500, { message: 'Failed to remove member' });
		}

		return {
			success: true,
			message: 'Member removed successfully'
		};
	},

	approveRequest: async ({ params, locals, request }) => {
		const session = locals.session;

		if (!session?.user) {
			throw redirect(303, `/login?redirect=/groups/${params.id}/members`);
		}

		const groupId = params.id;
		if (!groupId) {
			return fail(400, { message: 'Group ID is required' });
		}

		// Parse and validate form data
		const formData = await request.formData();
		const memberId = formData.get('memberId');

		const validation = joinRequestResponseSchema.safeParse({
			member_id: memberId,
			approve: true,
			message: null
		});

		if (!validation.success) {
			return fail(400, {
				message: validation.error.issues[0]?.message || 'Invalid input'
			});
		}

		const { member_id: validMemberId } = validation.data;

		// Check current user's role
		const { data: currentUserMembership, error: membershipError } = await supabase
			.from('group_members')
			.select('role')
			.eq('group_id', groupId)
			.eq('user_id', session.user.id)
			.eq('status', 'active')
			.single();

		if (membershipError || !currentUserMembership) {
			return fail(403, { message: 'You are not a member of this group' });
		}

		const currentUserRole = currentUserMembership.role as GroupMemberRole;

		// Only leadership can approve requests
		const leadershipRoles: GroupMemberRole[] = ['organizer', 'co_organizer', 'assistant_organizer'];
		if (!leadershipRoles.includes(currentUserRole)) {
			return fail(403, { message: 'Only group leadership can approve join requests' });
		}

		// Verify the request exists and is pending
		const { data: pendingRequest, error: requestError } = await supabase
			.from('group_members')
			.select('id, status')
			.eq('id', validMemberId)
			.eq('group_id', groupId)
			.eq('status', 'pending')
			.single();

		if (requestError || !pendingRequest) {
			return fail(404, { message: 'Join request not found' });
		}

		// Approve the request by updating status to active
		const { error: updateError } = await supabase
			.from('group_members')
			.update({ status: 'active' })
			.eq('id', validMemberId)
			.eq('group_id', groupId);

		if (updateError) {
			return fail(500, { message: 'Failed to approve request' });
		}

		return {
			success: true,
			message: 'Join request approved successfully'
		};
	},

	denyRequest: async ({ params, locals, request }) => {
		const session = locals.session;

		if (!session?.user) {
			throw redirect(303, `/login?redirect=/groups/${params.id}/members`);
		}

		const groupId = params.id;
		if (!groupId) {
			return fail(400, { message: 'Group ID is required' });
		}

		// Parse and validate form data
		const formData = await request.formData();
		const memberId = formData.get('memberId');
		const message = formData.get('message')?.toString() || null;

		const validation = joinRequestResponseSchema.safeParse({
			member_id: memberId,
			approve: false,
			message
		});

		if (!validation.success) {
			return fail(400, {
				message: validation.error.issues[0]?.message || 'Invalid input'
			});
		}

		const { member_id: validMemberId } = validation.data;

		// Check current user's role
		const { data: currentUserMembership, error: membershipError } = await supabase
			.from('group_members')
			.select('role')
			.eq('group_id', groupId)
			.eq('user_id', session.user.id)
			.eq('status', 'active')
			.single();

		if (membershipError || !currentUserMembership) {
			return fail(403, { message: 'You are not a member of this group' });
		}

		const currentUserRole = currentUserMembership.role as GroupMemberRole;

		// Only leadership can deny requests
		const leadershipRoles: GroupMemberRole[] = ['organizer', 'co_organizer', 'assistant_organizer'];
		if (!leadershipRoles.includes(currentUserRole)) {
			return fail(403, { message: 'Only group leadership can deny join requests' });
		}

		// Verify the request exists and is pending
		const { data: pendingRequest, error: requestError } = await supabase
			.from('group_members')
			.select('id, status')
			.eq('id', validMemberId)
			.eq('group_id', groupId)
			.eq('status', 'pending')
			.single();

		if (requestError || !pendingRequest) {
			return fail(404, { message: 'Join request not found' });
		}

		// Deny the request by deleting the membership record
		// Note: In a production app, you might want to log the denial with the message
		const { error: deleteError } = await supabase
			.from('group_members')
			.delete()
			.eq('id', validMemberId)
			.eq('group_id', groupId);

		if (deleteError) {
			return fail(500, { message: 'Failed to deny request' });
		}

		return {
			success: true,
			message: 'Join request denied'
		};
	}
};
