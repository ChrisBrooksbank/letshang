<script lang="ts">
	import { superForm } from 'sveltekit-superforms';
	import GoogleOAuthButton from '$lib/components/GoogleOAuthButton.svelte';
	import AppleOAuthButton from '$lib/components/AppleOAuthButton.svelte';
	import type { PageData } from './$types';

	export let data: PageData;

	const { form, errors, enhance, delayed } = superForm(data.form, {
		resetForm: false
	});
</script>

<svelte:head>
	<title>Register - LetsHang</title>
</svelte:head>

<div class="container mx-auto max-w-md p-4">
	<div class="mb-8">
		<h1 class="text-3xl font-bold mb-2">Create an account</h1>
		<p class="text-gray-600">Join LetsHang to discover events and connect with people</p>
	</div>

	<!-- OAuth Buttons -->
	<div class="mb-6 space-y-3">
		<GoogleOAuthButton supabase={data.supabase} mode="signup" />
		<AppleOAuthButton supabase={data.supabase} mode="signup" />

		<!-- Divider -->
		<div class="relative my-6">
			<div class="absolute inset-0 flex items-center">
				<div class="w-full border-t border-gray-300"></div>
			</div>
			<div class="relative flex justify-center text-sm">
				<span class="px-2 bg-white text-gray-500">Or continue with email</span>
			</div>
		</div>
	</div>

	<form method="POST" use:enhance class="space-y-6">
		<!-- Email Field -->
		<div>
			<label for="email" class="block text-sm font-medium text-gray-700 mb-2">
				Email address
			</label>
			<input
				id="email"
				name="email"
				type="email"
				autocomplete="email"
				required
				bind:value={$form.email}
				aria-invalid={$errors.email ? 'true' : undefined}
				aria-describedby={$errors.email ? 'email-error' : undefined}
				class="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
				class:border-red-500={$errors.email}
				placeholder="you@example.com"
			/>
			{#if $errors.email && Array.isArray($errors.email)}
				<p id="email-error" class="mt-2 text-sm text-red-600" role="alert">
					{$errors.email[0] ?? ''}
				</p>
			{/if}
		</div>

		<!-- Password Field -->
		<div>
			<label for="password" class="block text-sm font-medium text-gray-700 mb-2"> Password </label>
			<input
				id="password"
				name="password"
				type="password"
				autocomplete="new-password"
				required
				bind:value={$form.password}
				aria-invalid={$errors.password ? 'true' : undefined}
				aria-describedby={$errors.password ? 'password-error' : undefined}
				class="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
				class:border-red-500={$errors.password}
				placeholder="At least 8 characters"
			/>
			{#if $errors.password && Array.isArray($errors.password)}
				<p id="password-error" class="mt-2 text-sm text-red-600" role="alert">
					{$errors.password[0] ?? ''}
				</p>
			{/if}
			<p class="mt-2 text-sm text-gray-500">Minimum 8 characters</p>
		</div>

		<!-- General Errors -->
		{#if $errors._errors && Array.isArray($errors._errors)}
			<div class="rounded-lg bg-red-50 p-4" role="alert">
				<p class="text-sm text-red-800">{$errors._errors[0] ?? ''}</p>
			</div>
		{/if}

		<!-- Submit Button -->
		<button
			type="submit"
			disabled={$delayed}
			class="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
		>
			{#if $delayed}
				<span>Creating account...</span>
			{:else}
				<span>Create account</span>
			{/if}
		</button>

		<!-- Login Link -->
		<p class="text-center text-sm text-gray-600">
			Already have an account?
			<a href="/login" class="text-blue-600 hover:text-blue-700 font-medium">Sign in</a>
		</p>
	</form>
</div>
