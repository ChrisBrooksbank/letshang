<script lang="ts">
	import type { PageData } from './$types';
	import BaseLayout from '$lib/components/BaseLayout.svelte';
	import type { NotificationPreference } from '$lib/schemas/notifications';

	let { data }: { data: PageData } = $props();

	// Notification type labels for display
	const notificationTypeLabels: Record<string, { title: string; description: string }> = {
		new_event_in_group: {
			title: 'New Event in Group',
			description: 'When a new event is created in a group you belong to'
		},
		rsvp_confirmation: {
			title: 'RSVP Confirmation',
			description: 'Confirmation when you RSVP to an event'
		},
		event_reminder: {
			title: 'Event Reminders',
			description: 'Reminders 7 days, 2 days, and day-of before events'
		},
		waitlist_promotion: {
			title: 'Waitlist Promotion',
			description: 'When you are promoted from a waitlist to confirmed attendee'
		},
		new_message: {
			title: 'New Messages',
			description: 'When you receive a new direct message'
		},
		group_announcement: {
			title: 'Group Announcements',
			description: 'Important announcements from group organizers'
		},
		event_update_cancellation: {
			title: 'Event Updates & Cancellations',
			description: 'When an event you RSVPed to is updated or cancelled'
		}
	};

	// Local state for preferences (synced with form)
	// Use $derived to properly react to data changes
	let preferences = $derived(
		data.preferences.map((p) => ({
			...p,
			saving: false
		}))
	);

	// Track saving state separately
	let savingStates = $state<Record<string, boolean>>({});

	// Handle toggle change
	async function handleToggle(
		preference: NotificationPreference,
		channel: 'pushEnabled' | 'emailEnabled' | 'inAppEnabled',
		value: boolean
	) {
		// Mark as saving
		savingStates[preference.notificationType] = true;

		// Build updated preference
		const updatedPreference = {
			...preference,
			[channel]: value
		};

		// Submit update to server
		const formData = new FormData();
		formData.append('notificationType', preference.notificationType);
		formData.append('pushEnabled', String(updatedPreference.pushEnabled));
		formData.append('emailEnabled', String(updatedPreference.emailEnabled));
		formData.append('inAppEnabled', String(updatedPreference.inAppEnabled));

		try {
			const response = await fetch('?/updatePreference', {
				method: 'POST',
				body: formData
			});

			if (!response.ok) {
				// Force page reload to revert changes
				window.location.reload();
			}
		} catch {
			// Force page reload to revert changes
			window.location.reload();
		} finally {
			savingStates[preference.notificationType] = false;
		}
	}
</script>

<BaseLayout>
	<div class="container mx-auto px-4 py-6 max-w-4xl">
		<!-- Page Header -->
		<div class="mb-8">
			<h1 class="text-3xl font-bold text-gray-900 mb-2">Notification Settings</h1>
			<p class="text-gray-600">
				Manage how you receive notifications for events, groups, and messages.
			</p>
		</div>

		<!-- Notification Preferences Table -->
		<div class="bg-white rounded-lg shadow overflow-hidden">
			<div class="overflow-x-auto">
				<table class="min-w-full divide-y divide-gray-200">
					<thead class="bg-gray-50">
						<tr>
							<th
								class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
							>
								Notification Type
							</th>
							<th
								class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
							>
								Push
							</th>
							<th
								class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
							>
								Email
							</th>
							<th
								class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
							>
								In-App
							</th>
						</tr>
					</thead>
					<tbody class="bg-white divide-y divide-gray-200">
						{#each preferences as preference}
							{@const label = notificationTypeLabels[preference.notificationType]}
							<tr class="hover:bg-gray-50">
								<td class="px-6 py-4">
									<div class="flex flex-col">
										<div class="text-sm font-medium text-gray-900">{label.title}</div>
										<div class="text-xs text-gray-500">{label.description}</div>
									</div>
								</td>
								<td class="px-6 py-4 text-center">
									<input
										type="checkbox"
										checked={preference.pushEnabled}
										disabled={savingStates[preference.notificationType] === true}
										onchange={(e) => {
											const target = e.target as HTMLInputElement;
											handleToggle(preference, 'pushEnabled', target.checked);
										}}
										class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
										aria-label="Enable push notifications for {label.title}"
									/>
								</td>
								<td class="px-6 py-4 text-center">
									<input
										type="checkbox"
										checked={preference.emailEnabled}
										disabled={savingStates[preference.notificationType] === true}
										onchange={(e) => {
											const target = e.target as HTMLInputElement;
											handleToggle(preference, 'emailEnabled', target.checked);
										}}
										class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
										aria-label="Enable email notifications for {label.title}"
									/>
								</td>
								<td class="px-6 py-4 text-center">
									<input
										type="checkbox"
										checked={preference.inAppEnabled}
										disabled={savingStates[preference.notificationType] === true}
										onchange={(e) => {
											const target = e.target as HTMLInputElement;
											handleToggle(preference, 'inAppEnabled', target.checked);
										}}
										class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
										aria-label="Enable in-app notifications for {label.title}"
									/>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>

		<!-- Help Text -->
		<div class="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
			<div class="flex">
				<div class="flex-shrink-0">
					<svg
						class="h-5 w-5 text-blue-400"
						fill="currentColor"
						viewBox="0 0 20 20"
						aria-hidden="true"
					>
						<path
							fill-rule="evenodd"
							d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
							clip-rule="evenodd"
						/>
					</svg>
				</div>
				<div class="ml-3 flex-1">
					<p class="text-sm text-blue-700">
						<strong>Push notifications</strong> require browser permission. Click the bell icon in
						your browser to enable.
						<br />
						<strong>Email notifications</strong> are sent to your registered email address.
						<br />
						<strong>In-app notifications</strong> appear in the notification center when you're using
						the app.
					</p>
				</div>
			</div>
		</div>
	</div>
</BaseLayout>
