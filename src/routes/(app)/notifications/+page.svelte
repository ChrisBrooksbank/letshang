<script lang="ts">
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';
	import BaseLayout from '$lib/components/BaseLayout.svelte';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	// Format relative time (e.g., "5m ago", "2h ago", "3d ago")
	function formatRelativeTime(dateString: string): string {
		const date = new Date(dateString);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMins = Math.floor(diffMs / 60000);
		const diffHours = Math.floor(diffMs / 3600000);
		const diffDays = Math.floor(diffMs / 86400000);

		if (diffMins < 1) return 'Just now';
		if (diffMins < 60) return `${diffMins}m ago`;
		if (diffHours < 24) return `${diffHours}h ago`;
		if (diffDays < 7) return `${diffDays}d ago`;
		return date.toLocaleDateString();
	}

	// Get icon for notification type
	function getNotificationIcon(type: string): string {
		const icons: Record<string, string> = {
			new_event_in_group: '🎉',
			rsvp_confirmation: '✓',
			event_reminder: '⏰',
			waitlist_promotion: '🎟️',
			new_message: '💬',
			group_announcement: '📢',
			event_update_cancellation: '⚠️'
		};
		return icons[type] || '🔔';
	}

	const unreadCount = $derived(data.notifications.filter((n) => !n.isRead).length);
	const hasNotifications = $derived(data.notifications.length > 0);
</script>

<svelte:head>
	<title>Notifications - LetsHang</title>
</svelte:head>

<BaseLayout unreadNotificationCount={data.unreadNotificationCount ?? 0}>
	<div class="notifications-page">
		<header class="notifications-header">
			<h1 class="notifications-title">Notifications</h1>
			{#if unreadCount > 0}
				<form method="POST" action="?/markAllRead" use:enhance>
					<button type="submit" class="mark-all-read-btn"> Mark all read </button>
				</form>
			{/if}
		</header>

		{#if !hasNotifications}
			<div class="empty-state">
				<p class="empty-state__icon">🔔</p>
				<p class="empty-state__message">No notifications yet</p>
				<p class="empty-state__hint">We'll let you know when something happens</p>
			</div>
		{:else}
			<ul class="notifications-list">
				{#each data.notifications as notification (notification.id)}
					<li class="notification-item" class:notification-item--unread={!notification.isRead}>
						<div class="notification-icon">
							{getNotificationIcon(notification.notificationType)}
						</div>
						<div class="notification-content">
							<h2 class="notification-title">{notification.title}</h2>
							<p class="notification-message">{notification.message}</p>
							<time class="notification-time" datetime={notification.createdAt}>
								{formatRelativeTime(notification.createdAt)}
							</time>
						</div>
						<div class="notification-actions">
							{#if !notification.isRead}
								<form method="POST" action="?/markRead" use:enhance>
									<input type="hidden" name="notificationId" value={notification.id} />
									<button type="submit" class="mark-read-btn" aria-label="Mark as read">
										<span class="mark-read-icon">✓</span>
									</button>
								</form>
							{/if}
							{#if notification.link}
								<a href={notification.link} class="notification-link" aria-label="View details">
									<span class="notification-link-icon">→</span>
								</a>
							{/if}
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</div>

	<style>
		.notifications-page {
			max-width: 768px;
			margin: 0 auto;
			padding: 1rem;
			padding-bottom: 80px; /* Space for bottom navigation */
		}

		.notifications-header {
			display: flex;
			justify-content: space-between;
			align-items: center;
			margin-bottom: 1.5rem;
			gap: 1rem;
		}

		.notifications-title {
			font-size: 1.5rem;
			font-weight: 700;
			color: #111827;
			margin: 0;
		}

		.mark-all-read-btn {
			padding: 0.5rem 1rem;
			background: white;
			color: #2563eb;
			border: 1px solid #2563eb;
			border-radius: 0.5rem;
			font-size: 0.875rem;
			font-weight: 500;
			cursor: pointer;
			transition: all 0.2s;
		}

		.mark-all-read-btn:hover {
			background: #eff6ff;
		}

		.empty-state {
			text-align: center;
			padding: 4rem 2rem;
			color: #6b7280;
		}

		.empty-state__icon {
			font-size: 4rem;
			margin-bottom: 1rem;
			opacity: 0.5;
		}

		.empty-state__message {
			font-size: 1.25rem;
			font-weight: 600;
			color: #374151;
			margin-bottom: 0.5rem;
		}

		.empty-state__hint {
			font-size: 0.875rem;
			color: #9ca3af;
		}

		.notifications-list {
			list-style: none;
			padding: 0;
			margin: 0;
			display: flex;
			flex-direction: column;
			gap: 0.5rem;
		}

		.notification-item {
			display: flex;
			align-items: flex-start;
			gap: 0.75rem;
			padding: 1rem;
			background: white;
			border: 1px solid #e5e7eb;
			border-radius: 0.5rem;
			transition: all 0.2s;
		}

		.notification-item--unread {
			background: #eff6ff;
			border-color: #bfdbfe;
		}

		.notification-icon {
			font-size: 1.5rem;
			flex-shrink: 0;
			line-height: 1;
		}

		.notification-content {
			flex: 1;
			min-width: 0;
		}

		.notification-title {
			font-size: 0.875rem;
			font-weight: 600;
			color: #111827;
			margin: 0 0 0.25rem 0;
		}

		.notification-message {
			font-size: 0.875rem;
			color: #4b5563;
			margin: 0 0 0.5rem 0;
			line-height: 1.4;
		}

		.notification-time {
			font-size: 0.75rem;
			color: #9ca3af;
		}

		.notification-actions {
			display: flex;
			align-items: flex-start;
			gap: 0.5rem;
			flex-shrink: 0;
		}

		.mark-read-btn,
		.notification-link {
			display: flex;
			align-items: center;
			justify-content: center;
			width: 2rem;
			height: 2rem;
			border: 1px solid #e5e7eb;
			border-radius: 0.375rem;
			background: white;
			color: #6b7280;
			text-decoration: none;
			cursor: pointer;
			transition: all 0.2s;
		}

		.mark-read-btn:hover,
		.notification-link:hover {
			background: #f9fafb;
			border-color: #d1d5db;
			color: #2563eb;
		}

		.mark-read-icon,
		.notification-link-icon {
			font-size: 0.875rem;
			line-height: 1;
		}

		/* Tablet and up */
		@media (min-width: 768px) {
			.notifications-page {
				padding: 2rem;
				padding-bottom: 2rem;
			}

			.notifications-header {
				margin-bottom: 2rem;
			}

			.notifications-title {
				font-size: 2rem;
			}
		}
	</style>
</BaseLayout>
