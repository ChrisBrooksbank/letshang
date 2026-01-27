import { supabase } from '$lib/server/supabase';
import type { Category } from '$lib/schemas/categories';

/**
 * Category statistics including counts of groups and events
 */
export interface CategoryStats {
	category: Category;
	groupCount: number;
	eventCount: number;
	topicCount: number;
}

/**
 * Fetch statistics for all categories
 * Returns counts of groups and events per category
 */
export async function fetchCategoryStats(): Promise<CategoryStats[]> {
	// Fetch all topics with their categories
	const { data: topics, error: topicsError } = await supabase.from('topics').select('id, category');

	if (topicsError) {
		// eslint-disable-next-line no-console
		console.error('Error fetching topics:', topicsError);
		throw new Error('Failed to fetch category data');
	}

	if (!topics || topics.length === 0) {
		return [];
	}

	// Group topics by category
	const topicsByCategory = new Map<Category, string[]>();
	for (const topic of topics) {
		if (!topic.category) continue;
		const categoryTopics = topicsByCategory.get(topic.category as Category) || [];
		categoryTopics.push(topic.id);
		topicsByCategory.set(topic.category as Category, categoryTopics);
	}

	// Fetch group counts per category
	const categoryStats: CategoryStats[] = [];

	for (const [category, topicIds] of topicsByCategory.entries()) {
		// Count groups with these topics
		const { count: groupCount, error: groupError } = await supabase
			.from('group_topics')
			.select('group_id', { count: 'exact', head: true })
			.in('topic_id', topicIds);

		if (groupError) {
			// eslint-disable-next-line no-console
			console.error(`Error counting groups for category ${category}:`, groupError);
			continue;
		}

		// Count events (events don't have topics yet, so this will be 0 for now)
		// TODO: When events get topic/category support, add event counting here
		const eventCount = 0;

		categoryStats.push({
			category,
			groupCount: groupCount || 0,
			eventCount,
			topicCount: topicIds.length
		});
	}

	// Sort by group count descending
	return categoryStats.sort((a, b) => b.groupCount - a.groupCount);
}

/**
 * Fetch groups for a specific category
 * Returns public groups that have topics in the given category
 */
export async function fetchGroupsByCategory(
	category: Category,
	limit = 20,
	offset = 0
): Promise<
	Array<{
		id: string;
		name: string;
		description: string | null;
		cover_image_url: string | null;
		group_type: string;
		created_at: string;
		member_count: number;
		topics: Array<{ id: string; name: string; slug: string }>;
	}>
> {
	// First, get topic IDs for this category
	const { data: topics, error: topicsError } = await supabase
		.from('topics')
		.select('id')
		.eq('category', category);

	if (topicsError) {
		// eslint-disable-next-line no-console
		console.error('Error fetching topics for category:', topicsError);
		throw new Error('Failed to fetch groups');
	}

	if (!topics || topics.length === 0) {
		return [];
	}

	const topicIds = topics.map((t) => t.id);

	// Get group IDs that have these topics
	const { data: groupTopics, error: groupTopicsError } = await supabase
		.from('group_topics')
		.select('group_id')
		.in('topic_id', topicIds);

	if (groupTopicsError) {
		// eslint-disable-next-line no-console
		console.error('Error fetching group topics:', groupTopicsError);
		throw new Error('Failed to fetch groups');
	}

	if (!groupTopics || groupTopics.length === 0) {
		return [];
	}

	const groupIds = [...new Set(groupTopics.map((gt) => gt.group_id))];

	// Fetch groups with member counts and topics
	const { data: groups, error: groupsError } = await supabase
		.from('groups')
		.select(
			`
			id,
			name,
			description,
			cover_image_url,
			group_type,
			created_at,
			group_topics!inner(
				topics(id, name, slug)
			)
		`
		)
		.in('id', groupIds)
		.eq('group_type', 'public') // Only show public groups
		.order('created_at', { ascending: false })
		.range(offset, offset + limit - 1);

	if (groupsError) {
		// eslint-disable-next-line no-console
		console.error('Error fetching groups:', groupsError);
		throw new Error('Failed to fetch groups');
	}

	if (!groups) {
		return [];
	}

	// Fetch member counts separately
	const groupsWithCounts = await Promise.all(
		groups.map(async (group) => {
			const { count: memberCount } = await supabase
				.from('group_members')
				.select('id', { count: 'exact', head: true })
				.eq('group_id', group.id)
				.eq('status', 'active');

			// Extract topics from nested structure
			// Supabase returns group_topics as an array of objects with nested topics object
			const groupTopics = group.group_topics as unknown as Array<{
				topics: { id: string; name: string; slug: string };
			}>;
			const topics = Array.isArray(groupTopics)
				? groupTopics.map((gt) => gt.topics).filter((t) => t !== null && t !== undefined)
				: [];

			return {
				...group,
				member_count: memberCount || 0,
				topics: topics
			};
		})
	);

	return groupsWithCounts;
}

/**
 * Fetch events for a specific category (placeholder for future implementation)
 * Currently returns empty array since events don't have category/topic associations yet
 */
export async function fetchEventsByCategory(
	_category: Category,
	_limit = 20,
	_offset = 0
): Promise<Array<unknown>> {
	// TODO: Implement when events get topic/category support
	// For now, return empty array
	return [];
}
