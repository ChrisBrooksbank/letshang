import { fail, redirect, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { groupCreateSchema } from '$lib/schemas/groups';

export const load: PageServerLoad = async ({ locals }) => {
	// Ensure user is authenticated
	const session = await locals.supabase.auth.getSession();
	if (!session.data.session) {
		throw redirect(303, '/login');
	}

	// Fetch topics for selection
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const { data: topics, error: topicsError } = await (locals.supabase as any)
		.from('topics')
		.select('id, name, category')
		.order('category', { ascending: true })
		.order('name', { ascending: true });

	if (topicsError) {
		// eslint-disable-next-line no-console
		console.error('Error fetching topics:', topicsError);
	}

	// Initialize empty form
	// @ts-expect-error - zod adapter type compatibility issue
	const form = await superValidate(null, zod(groupCreateSchema));

	return {
		form,
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		topics: (topics as any[]) || []
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		// Ensure user is authenticated
		const session = await locals.supabase.auth.getSession();
		if (!session.data.session) {
			throw redirect(303, '/login');
		}

		// Validate form data
		// @ts-expect-error - zod adapter type compatibility issue
		const form = await superValidate(request, zod(groupCreateSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		// Type assertions for form.data
		const { name, description, cover_image_url, group_type, location, topic_ids } = form.data as {
			name: string;
			description?: string | null;
			cover_image_url?: string | null;
			group_type: 'public' | 'private';
			location?: string | null;
			topic_ids: string[];
		};

		// Insert group into database
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const { data: group, error: groupError } = await (locals.supabase as any)
			.from('groups')
			.insert({
				organizer_id: session.data.session.user.id,
				name,
				description: description || null,
				cover_image_url: cover_image_url || null,
				group_type,
				location: location || null
			})
			.select()
			.single();

		if (groupError) {
			// Log error for debugging (in production, use proper logging service)
			if (process.env.NODE_ENV !== 'production') {
				// eslint-disable-next-line no-console
				console.error('Error creating group:', groupError);
			}
			return fail(500, {
				form: {
					...form,
					errors: {
						_errors: ['Failed to create group. Please try again.']
					}
				}
			});
		}

		// Insert group topics into junction table
		if (topic_ids.length > 0) {
			const topicInserts = topic_ids.map((topic_id) => ({
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				group_id: (group as any).id,
				topic_id
			}));

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const { error: topicsError } = await (locals.supabase as any)
				.from('group_topics')
				.insert(topicInserts);

			if (topicsError) {
				// Log error but don't fail the request since group was created
				if (process.env.NODE_ENV !== 'production') {
					// eslint-disable-next-line no-console
					console.error('Error adding topics to group:', topicsError);
				}
			}
		}

		// Redirect to the group page (will be created in a future iteration)
		// For now, redirect to dashboard
		throw redirect(303, `/dashboard`);
	}
};
