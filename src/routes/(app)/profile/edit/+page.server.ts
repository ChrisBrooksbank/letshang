import { fail, redirect, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { superValidate } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { profileUpdateSchema } from '$lib/schemas/profile';

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
		.select('display_name, bio, location, profile_photo_url')
		.eq('id', session.data.session.user.id)
		.single();

	if (error) {
		// If profile doesn't exist, initialize with empty values
		const form = await superValidate(
			{
				displayName: '',
				bio: '',
				location: '',
				profilePhotoUrl: ''
			},
			// @ts-expect-error - Known Zod/Superforms type incompatibility with optional fields
			zod(profileUpdateSchema)
		);
		return { form };
	}

	// Initialize form with existing profile data
	const form = await superValidate(
		{
			displayName: profile.display_name || '',
			bio: profile.bio || '',
			location: profile.location || '',
			profilePhotoUrl: profile.profile_photo_url || ''
		},
		// @ts-expect-error - Known Zod/Superforms type incompatibility with optional fields
		zod(profileUpdateSchema)
	);

	return { form };
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
		const form = await superValidate(request, zod(profileUpdateSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		// Type assertions for form.data
		let { displayName, bio, location, profilePhotoUrl } = form.data as {
			displayName: string;
			bio: string;
			location: string;
			profilePhotoUrl: string;
		};

		// Trim all string fields
		displayName = displayName.trim();
		bio = bio.trim();
		location = location.trim();
		profilePhotoUrl = profilePhotoUrl.trim();

		// Validate displayName after trimming
		if (displayName.length < 2) {
			return fail(400, {
				form: {
					...form,
					errors: {
						displayName: ['Display name must be at least 2 characters']
					}
				}
			});
		}

		// Update user profile in database
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const { error } = await (locals.supabase as any)
			.from('users')
			.update({
				display_name: displayName,
				bio: bio || null,
				location: location || null,
				profile_photo_url: profilePhotoUrl || null
			})
			.eq('id', session.data.session.user.id);

		if (error) {
			// Log error for debugging (in production, use proper logging service)
			if (process.env.NODE_ENV !== 'production') {
				// eslint-disable-next-line no-console
				console.error('Error updating profile:', error);
			}
			return fail(500, {
				form: {
					...form,
					errors: {
						_errors: ['Failed to update profile. Please try again.']
					}
				}
			});
		}

		// Redirect back to profile page after successful update
		throw redirect(303, '/profile');
	}
};
