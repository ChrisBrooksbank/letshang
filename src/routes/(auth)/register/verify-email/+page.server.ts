import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions: Actions = {
	resend: async ({ request, locals }) => {
		const formData = await request.formData();
		const email = formData.get('email') as string;

		if (!email) {
			return fail(400, {
				error: 'Email is required'
			});
		}

		// Resend the verification email using Supabase
		const { error } = await locals.supabase.auth.resend({
			type: 'signup',
			email,
			options: {
				emailRedirectTo: `${request.headers.get('origin')}/auth/callback`
			}
		});

		if (error) {
			// Don't reveal if email exists or not (prevent enumeration)
			// Just return a generic error
			return fail(500, {
				error: 'Failed to resend verification email. Please try again.'
			});
		}

		return {
			success: true,
			message: 'Verification email resent successfully'
		};
	}
};
