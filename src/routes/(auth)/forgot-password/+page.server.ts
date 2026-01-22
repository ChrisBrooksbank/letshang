import { fail } from '@sveltejs/kit';
import { superValidate, message } from 'sveltekit-superforms';
import { zod } from 'sveltekit-superforms/adapters';
import { passwordResetRequestSchema, type PasswordResetRequestSchema } from '$lib/schemas/auth';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	// Initialize the form with the schema
	// @ts-expect-error - zod adapter type compatibility issue with sveltekit-superforms 2.x
	const form = await superValidate(null, zod(passwordResetRequestSchema));
	return { form };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		// @ts-expect-error - zod adapter type compatibility issue with sveltekit-superforms 2.x
		const form = await superValidate(request, zod(passwordResetRequestSchema));

		// Validate form data
		if (!form.valid) {
			return fail(400, { form });
		}

		// TypeScript doesn't infer form.data types correctly, so we assert them
		// Normalize email to lowercase
		const data = form.data as PasswordResetRequestSchema;
		const email = data.email.toLowerCase();

		// Request password reset from Supabase
		// IMPORTANT: No email enumeration - same success message regardless of whether email exists
		const { error } = await locals.supabase.auth.resetPasswordForEmail(email, {
			redirectTo: `${request.headers.get('origin')}/reset-password`
		});

		// Even if there's an error, we don't reveal it to prevent email enumeration
		// This follows security best practice: same message for exists/doesn't exist
		// Errors are silently ignored to prevent email enumeration
		void error;

		// Always return success message to prevent email enumeration
		// AC: No email enumeration (same message for exists/doesn't)
		return message(
			form,
			'If an account exists with that email, you will receive a password reset link shortly. Please check your inbox.'
		);
	}
};
