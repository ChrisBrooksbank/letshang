import { error, redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { supabase } from '$lib/server/supabase';
import { joinRequestSchema } from '$lib/schemas/groups';

export const load: PageServerLoad = async ({ params, locals }) => {
	const session = locals.session;
	const groupId = params.id;

	if (!groupId) {
		throw error(400, 'Group ID is required');
	}

	// Fetch group details with organizer info
	const { data: group, error: groupError } = await supabase
		.from('groups')
		.select(
			`
			*,
			organizer:users!groups_organizer_id_fkey(id, display_name, avatar_url)
		`
		)
		.eq('id', groupId)
		.single();

	if (groupError || !group) {
		throw error(404, 'Group not found');
	}

	// Fetch group topics
	const { data: groupTopics, error: _topicsError } = await supabase
		.from('group_topics')
		.select('topic_id, topics!inner(id, name, category)')
		.eq('group_id', groupId);

	// Silently continue if topics fetch fails - topics are optional display element

	// Fetch member count
	const { count: memberCount, error: _memberCountError } = await supabase
		.from('group_members')
		.select('*', { count: 'exact', head: true })
		.eq('group_id', groupId)
		.eq('status', 'active');

	// Silently continue if member count fails - will default to 0

	// Fetch upcoming events count (if events exist)
	const { count: upcomingEventsCount, error: _eventsCountError } = await supabase
		.from('events')
		.select('*', { count: 'exact', head: true })
		.eq('group_id', groupId)
		.gte('start_time', new Date().toISOString());

	// Silently continue if events count fails - will default to 0

	// Check if current user is a member
	let userMembership = null;
	let hasPendingRequest = false;

	if (session?.user) {
		const { data: membership, error: _membershipError } = await supabase
			.from('group_members')
			.select('*')
			.eq('group_id', groupId)
			.eq('user_id', session.user.id)
			.single();

		// Silently continue if membership check fails - will assume not a member

		userMembership = membership;

		// Check for pending join request if not already a member
		if (!membership) {
			hasPendingRequest = membership?.status === 'pending';
		}
	}

	// Extract topics from the nested structure and ensure proper typing
	const extractedTopics: Array<{ id: string; name: string; category: string }> =
		groupTopics
			?.map((gt) => {
				// gt.topics might be an object or an array depending on Supabase relation
				const topicData = gt.topics;
				if (topicData && typeof topicData === 'object' && !Array.isArray(topicData)) {
					return topicData as { id: string; name: string; category: string };
				}
				return null;
			})
			.filter(
				(t): t is { id: string; name: string; category: string } => t !== null && 'id' in t
			) || [];

	return {
		group,
		topics: extractedTopics,
		memberCount: memberCount || 0,
		upcomingEventsCount: upcomingEventsCount || 0,
		userMembership,
		hasPendingRequest,
		isAuthenticated: !!session?.user
	};
};

export const actions: Actions = {
	join: async ({ params, locals, request }) => {
		const session = locals.session;

		if (!session?.user) {
			throw redirect(303, `/login?redirect=/groups/${params.id}`);
		}

		const groupId = params.id;

		if (!groupId) {
			throw error(400, 'Group ID is required');
		}

		// Parse form data
		const formData = await request.formData();
		const message = formData.get('message')?.toString() || null;

		// Validate the request
		const validation = joinRequestSchema.safeParse({
			group_id: groupId,
			message
		});

		if (!validation.success) {
			return fail(400, {
				success: false,
				message: validation.error.issues[0]?.message || 'Invalid join request'
			});
		}

		// Fetch group to determine type
		const { data: group, error: groupError } = await supabase
			.from('groups')
			.select('group_type')
			.eq('id', groupId)
			.single();

		if (groupError || !group) {
			return { success: false, message: 'Group not found' };
		}

		// Determine the status based on group type
		const status = group.group_type === 'public' ? 'active' : 'pending';

		// Insert membership with optional message
		const { error: insertError } = await supabase.from('group_members').insert({
			group_id: groupId,
			user_id: session.user.id,
			role: 'member',
			status,
			join_request_message: status === 'pending' ? message : null
		});

		if (insertError) {
			return {
				success: false,
				message:
					insertError.code === '23505'
						? 'You are already a member or have a pending request'
						: 'Failed to join group'
			};
		}

		return {
			success: true,
			message:
				status === 'active'
					? 'Successfully joined the group!'
					: 'Join request sent! Waiting for approval.'
		};
	}
};
