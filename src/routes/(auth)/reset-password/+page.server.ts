import { fail, redirect } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { passwordResetSchema, type PasswordResetSchema } from '$lib/schemas/auth';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	// Check if we have the necessary hash fragments for password reset
	// Supabase sends the reset token in the URL hash (e.g., #access_token=...)
	// This is handled by the auth callback route

	// Verify user is in password reset flow
	const {
		data: { user },
		error
	} = await locals.supabase.auth.getUser();

	if (error || !user) {
		// Invalid or expired reset link
		const form = await superValidate(null, zod4(passwordResetSchema));
		return {
			form,
			error: 'Invalid or expired reset link. Please request a new password reset.'
		};
	}

	// Initialize the form with the schema
	const form = await superValidate(null, zod4(passwordResetSchema));
	return { form };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const form = await superValidate(request, zod4(passwordResetSchema));

		// Validate form data
		if (!form.valid) {
			return fail(400, { form });
		}

		// TypeScript doesn't infer form.data types correctly, so we assert them
		const data = form.data as PasswordResetSchema;
		const password = data.password;

		// Update the user's password
		// AC: Password change invalidates old sessions
		const { error } = await locals.supabase.auth.updateUser({
			password
		});

		if (error) {
			// Handle errors
			return fail(500, {
				form: {
					...form,
					errors: {
						_errors: ['Failed to reset password. Please try again or request a new reset link.']
					}
				}
			});
		}

		// Success - redirect to login
		// Note: Supabase automatically invalidates old sessions when password is changed
		throw redirect(303, '/login?reset=success');
	}
};
