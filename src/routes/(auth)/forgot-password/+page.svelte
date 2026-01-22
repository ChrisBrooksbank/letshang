<script lang="ts">
	import { superForm } from 'sveltekit-superforms';
	import type { PageData } from './$types';

	export let data: PageData;

	const { form, errors, enhance, delayed, message } = superForm(data.form, {
		resetForm: false
	});
</script>

<svelte:head>
	<title>Forgot Password - LetsHang</title>
</svelte:head>

<div class="container mx-auto max-w-md p-4">
	<div class="mb-8">
		<h1 class="text-3xl font-bold mb-2">Reset your password</h1>
		<p class="text-gray-600">Enter your email and we'll send you a reset link</p>
	</div>

	{#if $message}
		<div class="rounded-lg bg-blue-50 p-4 mb-6" role="status">
			<p class="text-sm text-blue-800">{$message}</p>
		</div>
	{/if}

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
				<span>Sending reset link...</span>
			{:else}
				<span>Send reset link</span>
			{/if}
		</button>

		<!-- Back to Login Link -->
		<p class="text-center text-sm text-gray-600">
			Remember your password?
			<a href="/login" class="text-blue-600 hover:text-blue-700 font-medium">Sign in</a>
		</p>
	</form>
</div>
