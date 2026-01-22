<script lang="ts">
	import { page } from '$app/stores';

	// Get email from query params
	const email = $page.url.searchParams.get('email') ?? '';
</script>

<svelte:head>
	<title>Verify Email - LetsHang</title>
</svelte:head>

<div class="container mx-auto max-w-md p-4">
	<div class="text-center space-y-6">
		<!-- Success Icon -->
		<div class="flex justify-center">
			<div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
				<svg
					class="w-8 h-8 text-green-600"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
					aria-hidden="true"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76"
					/>
				</svg>
			</div>
		</div>

		<!-- Heading -->
		<div>
			<h1 class="text-3xl font-bold mb-2">Check your email</h1>
			<p class="text-gray-600">
				We've sent a verification link to
				{#if email}
					<span class="font-medium text-gray-900">{email}</span>
				{:else}
					<span class="font-medium text-gray-900">your email address</span>
				{/if}
			</p>
		</div>

		<!-- Instructions -->
		<div class="text-left bg-blue-50 rounded-lg p-4">
			<h2 class="font-semibold text-blue-900 mb-2">Next steps:</h2>
			<ol class="space-y-2 text-sm text-blue-800">
				<li class="flex items-start">
					<span class="font-bold mr-2">1.</span>
					<span>Check your inbox (and spam folder just in case)</span>
				</li>
				<li class="flex items-start">
					<span class="font-bold mr-2">2.</span>
					<span>Click the verification link in the email</span>
				</li>
				<li class="flex items-start">
					<span class="font-bold mr-2">3.</span>
					<span>You'll be automatically signed in</span>
				</li>
			</ol>
		</div>

		<!-- Additional Info -->
		<div class="text-sm text-gray-600 space-y-2">
			<p>The verification link is valid for 24 hours.</p>
			<p>
				Didn't receive the email?
				<button class="text-blue-600 hover:text-blue-700 font-medium underline">
					Resend verification email
				</button>
			</p>
		</div>

		<!-- Back to Home -->
		<div class="pt-4 border-t border-gray-200">
			<a
				href="/"
				class="inline-block text-sm text-gray-600 hover:text-gray-900 font-medium transition"
			>
				← Back to home
			</a>
		</div>
	</div>
</div>
