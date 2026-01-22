<script lang="ts">
	import { superForm } from 'sveltekit-superforms';
	import type { PageData } from './$types';

	export let data: PageData;

	const { form, errors, enhance, delayed } = superForm(data.form, {
		resetForm: false
	});
</script>

<svelte:head>
	<title>Reset Password - LetsHang</title>
</svelte:head>

<div class="container mx-auto max-w-md p-4">
	<div class="mb-8">
		<h1 class="text-3xl font-bold mb-2">Set new password</h1>
		<p class="text-gray-600">Enter a new password for your account</p>
	</div>

	{#if data.error}
		<div class="rounded-lg bg-red-50 p-4 mb-6" role="alert">
			<p class="text-sm text-red-800">{data.error}</p>
		</div>
	{/if}

	<form method="POST" use:enhance class="space-y-6">
		<!-- Password Field -->
		<div>
			<label for="password" class="block text-sm font-medium text-gray-700 mb-2">
				New password
			</label>
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

		<!-- Confirm Password Field -->
		<div>
			<label for="confirmPassword" class="block text-sm font-medium text-gray-700 mb-2">
				Confirm new password
			</label>
			<input
				id="confirmPassword"
				name="confirmPassword"
				type="password"
				autocomplete="new-password"
				required
				bind:value={$form.confirmPassword}
				aria-invalid={$errors.confirmPassword ? 'true' : undefined}
				aria-describedby={$errors.confirmPassword ? 'confirmPassword-error' : undefined}
				class="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
				class:border-red-500={$errors.confirmPassword}
				placeholder="Re-enter your password"
			/>
			{#if $errors.confirmPassword && Array.isArray($errors.confirmPassword)}
				<p id="confirmPassword-error" class="mt-2 text-sm text-red-600" role="alert">
					{$errors.confirmPassword[0] ?? ''}
				</p>
			{/if}
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
				<span>Updating password...</span>
			{:else}
				<span>Reset password</span>
			{/if}
		</button>

		<!-- Back to Login Link -->
		<p class="text-center text-sm text-gray-600">
			Remember your password?
			<a href="/login" class="text-blue-600 hover:text-blue-700 font-medium">Sign in</a>
		</p>
	</form>
</div>
