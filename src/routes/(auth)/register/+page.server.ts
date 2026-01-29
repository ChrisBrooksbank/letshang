import { fail, redirect } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { registrationSchema } from '$lib/schemas/auth';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	// Initialize the form with the schema
	const form = await superValidate(null, zod4(registrationSchema));
	return { form };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const form = await superValidate(request, zod4(registrationSchema));

		// Validate form data
		if (!form.valid) {
			return fail(400, { form });
		}

		// TypeScript doesn't infer form.data types correctly, so we assert them
		const email = form.data.email as string;
		const password = form.data.password as string;

		// Attempt to sign up with Supabase
		const { data, error } = await locals.supabase.auth.signUp({
			email,
			password,
			options: {
				// Email confirmation is required
				emailRedirectTo: `${request.headers.get('origin')}/auth/callback`
			}
		});

		// Handle errors
		if (error) {
			// Check for duplicate email
			if (error.message.includes('already registered') || error.message.includes('duplicate')) {
				return fail(400, {
					form: {
						...form,
						errors: {
							email: ['An account with this email already exists']
						}
					}
				});
			}

			// Generic error
			return fail(500, {
				form: {
					...form,
					errors: {
						_errors: ['Registration failed. Please try again.']
					}
				}
			});
		}

		// Check if user needs to verify email
		if (data.user && !data.user.email_confirmed_at) {
			// Redirect to verification pending page
			throw redirect(303, `/register/verify-email?email=${encodeURIComponent(email)}`);
		}

		// If email was auto-confirmed (unlikely in production), redirect to dashboard
		throw redirect(303, '/dashboard');
	}
};
