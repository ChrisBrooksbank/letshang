<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import {
		getOnlineStatus,
		getDataFreshnessLabel,
		subscribeOnlineStatus,
		initOnlineStatusListeners,
		destroyOnlineStatusListeners
	} from '$lib/utils/offline-indicators';

	/**
	 * OfflineBanner - Displays a dismissible banner when the user is offline
	 * and indicates whether displayed data is cached or live.
	 *
	 * Listens to online/offline window events and updates in real time.
	 * The banner is accessible with a status role and appropriate ARIA attributes.
	 */

	let isOnline = $state(true);
	let unsubscribe: (() => void) | null = null;

	onMount(() => {
		isOnline = getOnlineStatus();
		initOnlineStatusListeners();
		unsubscribe = subscribeOnlineStatus((status) => {
			isOnline = status;
		});
	});

	onDestroy(() => {
		if (unsubscribe) unsubscribe();
		destroyOnlineStatusListeners();
	});

	const freshnessLabel = $derived(getDataFreshnessLabel(isOnline));
	const showBanner = $derived(!isOnline);
</script>

{#if showBanner}
	<div
		class="offline-banner"
		role="status"
		aria-live="polite"
		aria-label="You are currently offline. Data shown is {freshnessLabel.toLowerCase()}."
	>
		<span class="offline-banner__icon" aria-hidden="true">📶</span>
		<span class="offline-banner__message">
			You are offline — showing <strong>{freshnessLabel.toLowerCase()}</strong> data
		</span>
	</div>
{/if}

<style>
	.offline-banner {
		/* Full-width amber/orange warning strip */
		background-color: #f59e0b;
		color: #1c1917;
		text-align: center;
		padding: 0.5rem 1rem;
		font-size: 0.875rem;
		font-weight: 500;

		/* Flex layout for icon + message alignment */
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;

		/* Stick to top, above other content */
		position: sticky;
		top: 0;
		z-index: 30;

		/* Minimum touch target height */
		min-height: 44px;
	}

	.offline-banner__icon {
		font-size: 1.125rem;
		line-height: 1;
	}

	.offline-banner__message {
		line-height: 1.4;
	}

	/* Compact on large screens */
	@media (min-width: 768px) {
		.offline-banner {
			padding: 0.375rem 1.5rem;
			font-size: 0.8125rem;
		}
	}
</style>
