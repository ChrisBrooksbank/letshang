<script lang="ts">
	import { onMount } from 'svelte';
	import {
		isInstallPromptDismissed,
		dismissInstallPrompt,
		isInstalledApp,
		captureInstallPrompt,
		triggerInstallPrompt
	} from '$lib/utils/install-prompt';

	/**
	 * InstallPrompt - Custom "Add to Home Screen" prompt with value proposition
	 *
	 * Listens for the browser's beforeinstallprompt event and shows a custom
	 * card explaining why installing the app is beneficial. Dismissable and
	 * remembers the user's preference via localStorage.
	 *
	 * Only shown when:
	 * - Browser supports PWA install (fires beforeinstallprompt)
	 * - App is not already installed (standalone mode)
	 * - User has not previously dismissed the prompt
	 */

	let deferredEvent: Event | null = $state(null);
	let dismissed = $state(false);
	let installing = $state(false);

	const shouldShow = $derived(deferredEvent !== null && !dismissed && !installing);

	onMount(() => {
		// Mark as dismissed if already installed or previously dismissed
		if (isInstalledApp() || isInstallPromptDismissed()) {
			dismissed = true;
		}

		function handleBeforeInstallPrompt(event: Event) {
			deferredEvent = captureInstallPrompt(event);
		}

		window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

		return () => {
			window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
		};
	});

	async function handleInstall() {
		if (!deferredEvent) return;
		installing = true;

		const result = await triggerInstallPrompt(deferredEvent);
		deferredEvent = null;

		if (result?.outcome === 'dismissed') {
			// User declined browser prompt — don't persist, allow retry later
			installing = false;
		}
		// If accepted, the app installs and the page may reload
	}

	function handleDismiss() {
		dismissInstallPrompt();
		dismissed = true;
		deferredEvent = null;
	}
</script>

{#if shouldShow}
	<div class="install-prompt" role="banner" aria-label="Install LetsHang app">
		<div class="install-prompt__icon" aria-hidden="true">
			<svg class="h-8 w-8 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
				/>
			</svg>
		</div>

		<div class="install-prompt__content">
			<h3 class="install-prompt__title">Add LetsHang to your home screen</h3>
			<p class="install-prompt__description">
				Get instant access to events and groups near you. Works offline and feels like a native app.
			</p>
		</div>

		<div class="install-prompt__actions">
			<button
				class="install-prompt__install"
				onclick={handleInstall}
				disabled={installing}
				aria-label="Install LetsHang app"
			>
				{installing ? 'Installing...' : 'Install'}
			</button>
			<button
				class="install-prompt__dismiss"
				onclick={handleDismiss}
				aria-label="Dismiss install prompt, do not show again"
			>
				Not now
			</button>
		</div>
	</div>
{/if}

<style>
	.install-prompt {
		display: flex;
		align-items: flex-start;
		gap: 1rem;
		padding: 1rem;
		background: linear-gradient(135deg, #eef2ff 0%, #f5f3ff 100%);
		border: 1px solid #c7d2fe;
		border-radius: 0.75rem;
		margin-bottom: 1rem;
	}

	.install-prompt__icon {
		flex-shrink: 0;
		margin-top: 0.25rem;
	}

	.install-prompt__content {
		flex: 1;
		min-width: 0;
	}

	.install-prompt__title {
		font-size: 1rem;
		font-weight: 600;
		color: #1e1b4b;
		margin-bottom: 0.25rem;
	}

	.install-prompt__description {
		font-size: 0.875rem;
		color: #4338ca;
		line-height: 1.5;
	}

	.install-prompt__actions {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		flex-shrink: 0;
	}

	.install-prompt__install {
		padding: 0.5rem 1rem;
		background: #4f46e5;
		color: white;
		border: none;
		border-radius: 0.5rem;
		font-size: 0.875rem;
		font-weight: 600;
		cursor: pointer;
		min-height: 44px;
		min-width: 80px;
		transition: background 0.2s;
	}

	.install-prompt__install:hover:not(:disabled) {
		background: #4338ca;
	}

	.install-prompt__install:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.install-prompt__dismiss {
		padding: 0.25rem 0.5rem;
		background: none;
		color: #6b7280;
		border: none;
		font-size: 0.8125rem;
		cursor: pointer;
		min-height: 44px;
		border-radius: 0.25rem;
		transition: color 0.2s;
	}

	.install-prompt__dismiss:hover {
		color: #374151;
	}

	/* Mobile: stack actions below content */
	@media (max-width: 640px) {
		.install-prompt {
			flex-direction: column;
		}

		.install-prompt__actions {
			flex-direction: row;
			width: 100%;
		}

		.install-prompt__install {
			flex: 1;
		}

		.install-prompt__dismiss {
			flex: 1;
			text-align: center;
		}
	}
</style>
