<script lang="ts">
	import { page } from '$app/stores';

	/**
	 * AppNavigation - Top-level navigation for authenticated app
	 *
	 * Mobile-first responsive navigation bar with:
	 * - Touch-friendly targets (44px minimum)
	 * - Active route highlighting
	 * - Responsive layout (bottom on mobile, top on desktop)
	 */

	// Navigation items
	const navItems = [
		{ href: '/dashboard', label: 'Home', icon: '🏠' },
		{ href: '/map', label: 'Map', icon: '🗺️' },
		{ href: '/search', label: 'Search', icon: '🔍' },
		{ href: '/calendar', label: 'Calendar', icon: '📅' },
		{ href: '/categories', label: 'Browse', icon: '📂' }
	];

	// Check if route is active
	function isActive(href: string): boolean {
		return $page.url.pathname === href || $page.url.pathname.startsWith(href + '/');
	}
</script>

<nav class="app-nav">
	<ul class="app-nav__list">
		{#each navItems as item}
			<li class="app-nav__item">
				<a
					href={item.href}
					class="app-nav__link"
					class:app-nav__link--active={isActive(item.href)}
					aria-current={isActive(item.href) ? 'page' : undefined}
				>
					<span class="app-nav__icon">{item.icon}</span>
					<span class="app-nav__label">{item.label}</span>
				</a>
			</li>
		{/each}
	</ul>
</nav>

<style>
	.app-nav {
		background: white;
		border-top: 1px solid #e5e7eb;
		position: sticky;
		bottom: 0;
		left: 0;
		right: 0;
		z-index: 20;
		box-shadow: 0 -2px 4px rgba(0, 0, 0, 0.05);
	}

	.app-nav__list {
		display: flex;
		justify-content: space-around;
		align-items: center;
		list-style: none;
		padding: 0;
		margin: 0;
		max-width: 100%;
	}

	.app-nav__item {
		flex: 1;
		max-width: 120px;
	}

	.app-nav__link {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 0.5rem;
		min-height: 56px;
		text-decoration: none;
		color: #6b7280;
		transition: color 0.2s;
		gap: 0.25rem;
	}

	.app-nav__link:hover {
		color: #2563eb;
	}

	.app-nav__link--active {
		color: #2563eb;
		font-weight: 600;
	}

	.app-nav__icon {
		font-size: 1.5rem;
		line-height: 1;
	}

	.app-nav__label {
		font-size: 0.75rem;
		line-height: 1;
	}

	/* Tablet and desktop: move to top and horizontal layout */
	@media (min-width: 768px) {
		.app-nav {
			position: sticky;
			top: 0;
			bottom: auto;
			border-top: none;
			border-bottom: 1px solid #e5e7eb;
			box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
		}

		.app-nav__list {
			justify-content: flex-start;
			gap: 1rem;
			padding: 0 1rem;
			max-width: 1200px;
			margin: 0 auto;
		}

		.app-nav__item {
			flex: 0;
		}

		.app-nav__link {
			flex-direction: row;
			gap: 0.5rem;
			padding: 1rem;
			min-height: 60px;
		}

		.app-nav__icon {
			font-size: 1.25rem;
		}

		.app-nav__label {
			font-size: 0.875rem;
		}
	}

	/* Large desktop: increase max-width */
	@media (min-width: 1280px) {
		.app-nav__list {
			max-width: 1400px;
			gap: 1.5rem;
		}
	}
</style>
