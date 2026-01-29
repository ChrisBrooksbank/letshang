import { fail, redirect } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { loginSchema } from '$lib/schemas/auth';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	// If already logged in, redirect to dashboard
	const session = await locals.supabase.auth.getSession();
	if (session.data.session) {
		throw redirect(303, '/dashboard');
	}

	// Initialize the form with the schema
	const form = await superValidate(null, zod4(loginSchema));
	return { form };
};

export const actions: Actions = {
	default: async ({ request, locals, cookies }) => {
		const form = await superValidate(request, zod4(loginSchema));

		// Validate form data
		if (!form.valid) {
			return fail(400, { form });
		}

		// TypeScript doesn't infer form.data types correctly, so we assert them
		const email = form.data.email as string;
		const password = form.data.password as string;
		const rememberMe = form.data.rememberMe as boolean;

		// Attempt to sign in with Supabase
		const { data, error } = await locals.supabase.auth.signInWithPassword({
			email,
			password
		});

		// Handle errors with generic message to prevent email enumeration
		if (error) {
			return fail(400, {
				form: {
					...form,
					errors: {
						_errors: ['Invalid email or password']
					}
				}
			});
		}

		// Check if user verified their email
		if (data.user && !data.user.email_confirmed_at) {
			// Sign out the user since email is not verified
			await locals.supabase.auth.signOut();

			return fail(400, {
				form: {
					...form,
					errors: {
						_errors: [
							'Please verify your email address. Check your inbox for the verification link.'
						]
					}
				}
			});
		}

		// Set session cookie with appropriate expiry based on "Remember Me" option
		// Supabase handles session refresh automatically, but we can control cookie max-age
		if (data.session) {
			// Set session cookie with shorter expiry (24 hours) or longer (7 days)
			// This is handled by setting the maxAge on the cookie
			// The actual session management is done by Supabase, but shorter cookie = shorter persistence
			const sessionCookieName = 'sb-access-token';

			// Get the existing cookie value
			const accessToken = data.session.access_token;

			// Set cookie with appropriate expiry based on rememberMe
			cookies.set(sessionCookieName, accessToken, {
				path: '/',
				maxAge: rememberMe ? 60 * 60 * 24 * 7 : 60 * 60 * 24, // 7 days vs 24 hours
				httpOnly: true,
				secure: true,
				sameSite: 'lax'
			});
		}

		// Successful login - redirect to dashboard
		throw redirect(303, '/dashboard');
	}
};
