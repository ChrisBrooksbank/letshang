<svelte:head>
	<title>LetsHang - Connect Through Local Events & Groups</title>
	<meta
		name="description"
		content="Find your community. Join local groups, attend events, and meet people who share your interests."
	/>
</svelte:head>

<div class="min-h-screen bg-gradient-to-b from-blue-50 to-white">
	<!-- Hero Section -->
	<div class="container mx-auto px-4 py-16 text-center">
		<h1 class="text-5xl font-bold text-gray-900 mb-6">
			Find Your <span class="text-blue-600">Community</span>
		</h1>
		<p class="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
			Join local groups, attend events, and connect with people who share your interests. Whether
			you're into tech, sports, arts, or just looking for new friends.
		</p>

		<div class="flex flex-col sm:flex-row gap-4 justify-center mb-12">
			<a
				href="/register"
				class="px-8 py-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition shadow-lg"
			>
				Get Started Free
			</a>
			<a
				href="/login"
				class="px-8 py-4 bg-white text-blue-600 font-semibold rounded-lg border-2 border-blue-600 hover:bg-blue-50 transition"
			>
				Sign In
			</a>
		</div>
	</div>

	<!-- Features Section -->
	<div class="container mx-auto px-4 py-12">
		<div class="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
			<div class="text-center p-6">
				<div class="text-5xl mb-4">📅</div>
				<h3 class="text-xl font-bold text-gray-900 mb-2">Discover Events</h3>
				<p class="text-gray-600">Find meetups, workshops, and hangouts happening near you.</p>
			</div>

			<div class="text-center p-6">
				<div class="text-5xl mb-4">👥</div>
				<h3 class="text-xl font-bold text-gray-900 mb-2">Join Groups</h3>
				<p class="text-gray-600">Connect with communities that match your interests.</p>
			</div>

			<div class="text-center p-6">
				<div class="text-5xl mb-4">🤝</div>
				<h3 class="text-xl font-bold text-gray-900 mb-2">Make Friends</h3>
				<p class="text-gray-600">Meet real people in person. No more endless scrolling.</p>
			</div>
		</div>
	</div>

	<!-- Categories Preview -->
	<div class="bg-white py-12">
		<div class="container mx-auto px-4">
			<h2 class="text-3xl font-bold text-center text-gray-900 mb-8">Explore by Interest</h2>
			<div class="flex flex-wrap justify-center gap-3 max-w-3xl mx-auto">
				{#each ['Tech', 'Sports', 'Arts', 'Social', 'Career', 'Music', 'Food', 'Outdoors'] as category}
					<span class="px-4 py-2 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
						{category}
					</span>
				{/each}
			</div>
		</div>
	</div>

	<!-- CTA Section -->
	<div class="container mx-auto px-4 py-16 text-center">
		<h2 class="text-3xl font-bold text-gray-900 mb-4">Ready to find your people?</h2>
		<p class="text-gray-600 mb-8">Join thousands of people connecting through local events.</p>
		<a
			href="/register"
			class="inline-block px-8 py-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition shadow-lg"
		>
			Create Your Free Account
		</a>
	</div>

	<!-- Footer -->
	<footer class="border-t border-gray-200 py-8">
		<div class="container mx-auto px-4 text-center text-gray-500 text-sm">
			<p>LetsHang - Community Meetup Platform</p>
		</div>
	</footer>
</div>
