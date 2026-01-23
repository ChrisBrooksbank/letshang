import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	// Ensure user is authenticated
	const session = await locals.supabase.auth.getSession();
	if (!session.data.session) {
		throw redirect(303, '/login');
	}

	// Fetch user profile from database
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const { data: profile, error } = await (locals.supabase as any)
		.from('users')
		.select('display_name, bio, location, profile_visibility, created_at')
		.eq('id', session.data.session.user.id)
		.single();

	if (error) {
		// If profile doesn't exist, return null profile
		return {
			profile: null,
			email: session.data.session.user.email
		};
	}

	return {
		profile: {
			displayName: profile.display_name,
			bio: profile.bio,
			location: profile.location,
			profileVisibility: profile.profile_visibility,
			createdAt: profile.created_at
		},
		email: session.data.session.user.email
	};
};
