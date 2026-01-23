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
	<title>Sign In - LetsHang</title>
</svelte:head>

<div class="container mx-auto max-w-md p-4">
	<div class="mb-8">
		<h1 class="text-3xl font-bold mb-2">Sign in to LetsHang</h1>
		<p class="text-gray-600">Welcome back! Sign in to your account</p>
	</div>

	<!-- OAuth Buttons -->
	<div class="mb-6 space-y-3">
		<GoogleOAuthButton supabase={data.supabase} mode="signin" />
		<AppleOAuthButton supabase={data.supabase} mode="signin" />

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
			<div class="flex items-center justify-between mb-2">
				<label for="password" class="block text-sm font-medium text-gray-700"> Password </label>
				<a href="/reset-password" class="text-sm text-blue-600 hover:text-blue-700 font-medium">
					Forgot password?
				</a>
			</div>
			<input
				id="password"
				name="password"
				type="password"
				autocomplete="current-password"
				required
				bind:value={$form.password}
				aria-invalid={$errors.password ? 'true' : undefined}
				aria-describedby={$errors.password ? 'password-error' : undefined}
				class="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
				class:border-red-500={$errors.password}
				placeholder="Enter your password"
			/>
			{#if $errors.password && Array.isArray($errors.password)}
				<p id="password-error" class="mt-2 text-sm text-red-600" role="alert">
					{$errors.password[0] ?? ''}
				</p>
			{/if}
		</div>

		<!-- Remember Me Checkbox -->
		<div class="flex items-center">
			<input
				id="rememberMe"
				name="rememberMe"
				type="checkbox"
				checked={$form.rememberMe === true}
				on:change={(e) => ($form.rememberMe = e.currentTarget.checked)}
				class="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
			/>
			<label for="rememberMe" class="ml-2 block text-sm text-gray-700">
				Remember me for 7 days
			</label>
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
				<span>Signing in...</span>
			{:else}
				<span>Sign in</span>
			{/if}
		</button>

		<!-- Register Link -->
		<p class="text-center text-sm text-gray-600">
			Don't have an account?
			<a href="/register" class="text-blue-600 hover:text-blue-700 font-medium">Create account</a>
		</p>
	</form>
</div>
