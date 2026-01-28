<script lang="ts">
	import {
		isPushSupported,
		getPermissionState,
		setupPushNotifications,
		PERMISSION_STATES
	} from '$lib/utils/push-notifications';
	import type { PermissionState } from '$lib/utils/push-notifications';

	/**
	 * PushNotificationPrompt - Permission prompt with clear value proposition
	 *
	 * Displays a card explaining why push notifications are useful,
	 * with an "Enable" button that triggers the browser permission prompt.
	 * Handles all permission states gracefully.
	 */

	interface Props {
		vapidPublicKey: string;
		/** Event dispatched when permission is granted and subscription saved */
		onEnabled?: () => void;
		/** Event dispatched when user dismisses or denies the prompt */
		onDismissed?: () => void;
	}

	let { vapidPublicKey, onEnabled, onDismissed }: Props = $props();

	let status: 'idle' | 'requesting' | 'success' | 'error' = $state('idle');
	let errorMessage: string = $state('');

	// Check initial permission state and support
	let permissionState: PermissionState = $state(PERMISSION_STATES.DEFAULT);
	let pushSupported = $state(false);

	// Initialize on mount
	$effect(() => {
		if (typeof window !== 'undefined') {
			pushSupported = isPushSupported();
			permissionState = getPermissionState();
		}
	});

	async function handleEnable() {
		status = 'requesting';

		const result = await setupPushNotifications(vapidPublicKey);

		if (result.success) {
			status = 'success';
			permissionState = PERMISSION_STATES.GRANTED;
			onEnabled?.();
		} else {
			status = 'error';
			errorMessage = result.error ?? 'Something went wrong';
			// If user denied, treat as dismissed
			if (getPermissionState() === PERMISSION_STATES.DENIED) {
				onDismissed?.();
			}
		}
	}

	function handleDismiss() {
		onDismissed?.();
	}

	// Determine whether to show the prompt
	const shouldShow = $derived(
		pushSupported &&
			(permissionState as string) !== PERMISSION_STATES.GRANTED &&
			(status as string) !== 'success'
	);
</script>

{#if shouldShow}
	<div class="push-prompt" role="alert" aria-live="polite">
		<div class="push-prompt__icon" aria-hidden="true">
			<svg class="h-8 w-8 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
				/>
			</svg>
		</div>

		<div class="push-prompt__content">
			<h3 class="push-prompt__title">Stay in the loop</h3>
			<p class="push-prompt__description">
				Enable push notifications to get instant updates for events you care about, reminders before
				upcoming events, and alerts when you're promoted from a waitlist.
			</p>

			{#if status === 'error'}
				<p class="push-prompt__error" role="alert">{errorMessage}</p>
			{/if}
		</div>

		<div class="push-prompt__actions">
			<button
				class="push-prompt__enable"
				onclick={handleEnable}
				disabled={status === 'requesting'}
				aria-label="Enable push notifications"
			>
				{status === 'requesting' ? 'Setting up...' : 'Enable'}
			</button>
			<button
				class="push-prompt__dismiss"
				onclick={handleDismiss}
				aria-label="Dismiss notification prompt"
			>
				Not now
			</button>
		</div>
	</div>
{/if}

<style>
	.push-prompt {
		display: flex;
		align-items: flex-start;
		gap: 1rem;
		padding: 1rem;
		background: linear-gradient(135deg, #eef2ff 0%, #f5f3ff 100%);
		border: 1px solid #c7d2fe;
		border-radius: 0.75rem;
		margin-bottom: 1.5rem;
	}

	.push-prompt__icon {
		flex-shrink: 0;
		margin-top: 0.25rem;
	}

	.push-prompt__content {
		flex: 1;
		min-width: 0;
	}

	.push-prompt__title {
		font-size: 1rem;
		font-weight: 600;
		color: #1e1b4b;
		margin-bottom: 0.25rem;
	}

	.push-prompt__description {
		font-size: 0.875rem;
		color: #4338ca;
		line-height: 1.5;
	}

	.push-prompt__error {
		font-size: 0.8125rem;
		color: #dc2626;
		margin-top: 0.5rem;
	}

	.push-prompt__actions {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		flex-shrink: 0;
	}

	.push-prompt__enable {
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

	.push-prompt__enable:hover:not(:disabled) {
		background: #4338ca;
	}

	.push-prompt__enable:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.push-prompt__dismiss {
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

	.push-prompt__dismiss:hover {
		color: #374151;
	}

	/* Mobile: stack actions below content */
	@media (max-width: 640px) {
		.push-prompt {
			flex-direction: column;
		}

		.push-prompt__actions {
			flex-direction: row;
			width: 100%;
		}

		.push-prompt__enable {
			flex: 1;
		}

		.push-prompt__dismiss {
			flex: 1;
			text-align: center;
		}
	}
</style>
