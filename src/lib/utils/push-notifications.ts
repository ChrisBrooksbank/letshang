/**
 * Push Notifications Utility
 *
 * Client-side utilities for Web Push API integration.
 * Handles subscription lifecycle, permission management, and delivery tracking.
 */

import type { PushSubscription } from '$lib/schemas/notifications';

const PUSH_API_ENDPOINT = '/api/push';

/** Permission states for push notifications */
export const PERMISSION_STATES = {
	DEFAULT: 'default',
	GRANTED: 'granted',
	DENIED: 'denied'
} as const;

export type PermissionState = (typeof PERMISSION_STATES)[keyof typeof PERMISSION_STATES];

/**
 * Check if the browser supports push notifications via the Service Worker API
 * @returns true if the browser supports push notifications
 */
export function isPushSupported(): boolean {
	return 'serviceWorker' in navigator && 'PushManager' in window;
}

/**
 * Get the current notification permission state
 * @returns The current permission state, or 'default' if unsupported
 */
export function getPermissionState(): PermissionState {
	if (!('Notification' in window)) {
		return PERMISSION_STATES.DEFAULT;
	}
	return Notification.permission as PermissionState;
}

/**
 * Request notification permission from the user.
 * Shows the browser's native permission prompt.
 * @returns The permission state after the prompt
 */
export async function requestPermission(): Promise<PermissionState> {
	if (!('Notification' in window)) {
		return PERMISSION_STATES.DEFAULT;
	}

	const permission = await Notification.requestPermission();
	return permission as PermissionState;
}

/**
 * Convert a base64url-encoded string to a Uint8Array
 * Required for the VAPID key format expected by PushManager
 * @param base64url - Base64url encoded string
 * @returns Uint8Array of the decoded bytes
 */
export function urlBase64ToUint8Array(base64url: string): Uint8Array {
	const padding = '='.repeat((4 - (base64url.length % 4)) % 4);
	const base64 = (base64url + padding).replace(/-/g, '+').replace(/_/g, '/');
	const rawString = atob(base64);
	const array = new Uint8Array(rawString.length);
	for (let i = 0; i < rawString.length; i++) {
		array[i] = rawString.charCodeAt(i);
	}
	return array;
}

/**
 * Subscribe to push notifications using the Service Worker.
 * Must be called after permission is granted and a service worker is registered.
 * @param vapidPublicKey - Base64url encoded VAPID public key from environment
 * @returns The push subscription object with endpoint and keys
 * @throws Error if subscription fails or push is unsupported
 */
export async function subscribeToPush(vapidPublicKey: string): Promise<PushSubscription> {
	if (!isPushSupported()) {
		throw new Error('Push notifications are not supported in this browser');
	}

	const registration = await navigator.serviceWorker.ready;

	const appServerKey = urlBase64ToUint8Array(vapidPublicKey);
	const subscription = await registration.pushManager.subscribe({
		userVisibleOnly: true,
		applicationServerKey: appServerKey.buffer as ArrayBuffer
	});

	// Extract keys from the subscription
	const p256dhKey = subscription.getKey('p256dh');
	const authKey = subscription.getKey('auth');

	if (!p256dhKey || !authKey) {
		throw new Error('Failed to extract encryption keys from push subscription');
	}

	// Convert ArrayBuffer keys to base64url strings
	const p256dh = arrayBufferToBase64url(p256dhKey);
	const auth = arrayBufferToBase64url(authKey);

	return {
		endpoint: subscription.endpoint,
		keys: { p256dh, auth }
	};
}

/**
 * Convert an ArrayBuffer to a base64url string
 * @param buffer - ArrayBuffer to convert
 * @returns Base64url encoded string
 */
function arrayBufferToBase64url(buffer: ArrayBuffer): string {
	let binary = '';
	const bytes = new Uint8Array(buffer);
	for (let i = 0; i < bytes.byteLength; i++) {
		binary += String.fromCharCode(bytes[i]);
	}
	return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Save a push subscription to the server.
 * Stores the subscription endpoint and keys for later push delivery.
 * @param subscription - The push subscription to save
 * @returns true if the subscription was saved successfully
 * @throws Error if the server request fails
 */
export async function saveSubscription(subscription: PushSubscription): Promise<boolean> {
	const response = await fetch(PUSH_API_ENDPOINT, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(subscription)
	});

	if (!response.ok) {
		const body = (await response.json().catch(() => ({}))) as { error?: string };
		throw new Error(body.error || 'Failed to save push subscription');
	}

	return true;
}

/**
 * Remove a push subscription from the server.
 * Called when the user unsubscribes or rejects push notifications.
 * @param endpoint - The subscription endpoint to remove
 * @returns true if the subscription was removed successfully
 * @throws Error if the server request fails
 */
export async function removeSubscription(endpoint: string): Promise<boolean> {
	const response = await fetch(PUSH_API_ENDPOINT, {
		method: 'DELETE',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({ endpoint })
	});

	if (!response.ok) {
		const body = (await response.json().catch(() => ({}))) as { error?: string };
		throw new Error(body.error || 'Failed to remove push subscription');
	}

	return true;
}

/**
 * Full push notification setup flow.
 * Handles permission request, subscription creation, and server registration.
 * @param vapidPublicKey - Base64url encoded VAPID public key
 * @returns Object with success status and subscription details
 */
export async function setupPushNotifications(vapidPublicKey: string): Promise<{
	success: boolean;
	subscription?: PushSubscription;
	error?: string;
}> {
	if (!isPushSupported()) {
		return { success: false, error: 'Push notifications are not supported in this browser' };
	}

	// Request permission if not already granted
	const permission = await requestPermission();
	if (permission !== PERMISSION_STATES.GRANTED) {
		return { success: false, error: 'Notification permission was not granted' };
	}

	// Subscribe to push
	let subscription: PushSubscription;
	try {
		subscription = await subscribeToPush(vapidPublicKey);
	} catch (e) {
		const message = e instanceof Error ? e.message : 'Unknown error during subscription';
		return { success: false, error: message };
	}

	// Save subscription to server
	try {
		await saveSubscription(subscription);
	} catch (e) {
		const message = e instanceof Error ? e.message : 'Failed to save subscription to server';
		return { success: false, error: message };
	}

	return { success: true, subscription };
}
