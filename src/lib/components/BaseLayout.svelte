<script lang="ts">
	import AppNavigation from './AppNavigation.svelte';

	/**
	 * BaseLayout - Mobile-first layout component
	 *
	 * Provides the foundational layout structure for all pages with:
	 * - Single-column mobile layout
	 * - Touch-friendly minimum touch targets (44px)
	 * - No horizontal scroll on any screen size
	 * - Responsive padding and spacing
	 * - App navigation (bottom on mobile, top on desktop)
	 *
	 * Usage:
	 * <BaseLayout>
	 *   <div slot="header">Header content</div>
	 *   <div>Main content</div>
	 *   <div slot="footer">Footer content</div>
	 * </BaseLayout>
	 */

	let {
		children,
		header,
		footer,
		showNav = true,
		unreadNotificationCount = 0
	} = $props<{
		children: import('svelte').Snippet;
		header?: import('svelte').Snippet;
		footer?: import('svelte').Snippet;
		showNav?: boolean;
		unreadNotificationCount?: number;
	}>();
</script>

<div class="base-layout">
	{#if showNav}
		<AppNavigation unreadCount={unreadNotificationCount} />
	{/if}

	{#if header}
		<header class="base-layout__header">
			{@render header()}
		</header>
	{/if}

	<main class="base-layout__main">
		{@render children()}
	</main>

	{#if footer}
		<footer class="base-layout__footer">
			{@render footer()}
		</footer>
	{/if}
</div>

<style>
	.base-layout {
		/* Full viewport height, mobile-friendly */
		min-height: 100vh;
		min-height: 100dvh; /* Dynamic viewport height for mobile browsers */

		/* Flex container for header/main/footer */
		display: flex;
		flex-direction: column;

		/* Prevent horizontal scroll */
		overflow-x: hidden;
		max-width: 100vw;
	}

	.base-layout__header {
		/* Sticky header for easy access */
		position: sticky;
		top: 0;
		z-index: 10;

		/* Touch-friendly minimum height */
		min-height: 44px;

		/* Background and shadow for visual separation */
		background-color: white;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

		/* Padding for touch targets */
		padding: 0.5rem 1rem;
	}

	.base-layout__main {
		/* Take up remaining space */
		flex: 1;

		/* Single-column mobile layout with responsive padding */
		padding: 1rem;
		max-width: 100%;

		/* Prevent content from causing horizontal scroll */
		overflow-x: hidden;
		word-wrap: break-word;
	}

	.base-layout__footer {
		/* Touch-friendly minimum height */
		min-height: 44px;

		/* Background and shadow for visual separation */
		background-color: white;
		border-top: 1px solid rgba(0, 0, 0, 0.1);

		/* Padding for touch targets */
		padding: 1rem;
	}

	/* Tablet and larger: add max-width and center content */
	@media (min-width: 768px) {
		.base-layout__main {
			padding: 1.5rem 2rem;
			max-width: 1200px;
			margin: 0 auto;
			width: 100%;
		}

		.base-layout__header,
		.base-layout__footer {
			padding: 1rem 2rem;
		}
	}

	/* Large desktop: increase max-width */
	@media (min-width: 1280px) {
		.base-layout__main {
			max-width: 1400px;
			padding: 2rem;
		}
	}
</style>
