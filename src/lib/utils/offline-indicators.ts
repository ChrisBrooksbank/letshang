/**
 * Offline indicators utility — detects online/offline status and
 * provides helpers for labelling data as cached vs live.
 *
 * Uses the Navigator.onLine API as the primary signal and listens
 * for 'online'/'offline' window events to keep the state current.
 *
 * Callers receive a plain boolean via `getOnlineStatus()` or can
 * register a callback via `subscribeOnlineStatus()` to be notified
 * on every transition.
 */

/** Callback invoked whenever the online status changes. */
export type OnlineStatusCallback = (isOnline: boolean) => void;

/** Set of active subscribers notified on status changes. */
const subscribers = new Set<OnlineStatusCallback>();

/**
 * Returns the current online status from the Navigator API.
 * Falls back to `true` during SSR where `navigator` is unavailable.
 */
export function getOnlineStatus(): boolean {
	if (typeof navigator === 'undefined') return true;
	return navigator.onLine;
}

/**
 * Returns a human-readable data freshness label.
 * When online, data is considered live.  When offline, it is cached.
 */
export function getDataFreshnessLabel(isOnline: boolean): string {
	return isOnline ? 'Live' : 'Cached';
}

/**
 * Register a callback to be called whenever the online status changes.
 * Returns an unsubscribe function.
 */
export function subscribeOnlineStatus(callback: OnlineStatusCallback): () => void {
	subscribers.add(callback);
	return () => {
		subscribers.delete(callback);
	};
}

/**
 * Notifies all registered subscribers of the current status.
 */
function notifySubscribers(isOnline: boolean): void {
	for (const cb of subscribers) {
		cb(isOnline);
	}
}

/**
 * Handles the window 'online' event.
 */
function handleOnline(): void {
	notifySubscribers(true);
}

/**
 * Handles the window 'offline' event.
 */
function handleOffline(): void {
	notifySubscribers(false);
}

/**
 * Attaches the online/offline event listeners to the window.
 * Safe to call multiple times — listeners are idempotent.
 * Must be called on the client side only.
 */
export function initOnlineStatusListeners(): void {
	if (typeof window === 'undefined') return;
	window.addEventListener('online', handleOnline);
	window.addEventListener('offline', handleOffline);
}

/**
 * Removes the online/offline event listeners from the window.
 * Useful for cleanup during component teardown or testing.
 */
export function destroyOnlineStatusListeners(): void {
	if (typeof window === 'undefined') return;
	window.removeEventListener('online', handleOnline);
	window.removeEventListener('offline', handleOffline);
}
