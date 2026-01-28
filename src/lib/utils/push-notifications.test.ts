import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
	isPushSupported,
	getPermissionState,
	requestPermission,
	urlBase64ToUint8Array,
	subscribeToPush,
	saveSubscription,
	removeSubscription,
	setupPushNotifications,
	PERMISSION_STATES
} from './push-notifications';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Store original properties to restore after tests
const originalPushManager = Object.getOwnPropertyDescriptor(window, 'PushManager');
const originalServiceWorker = Object.getOwnPropertyDescriptor(navigator, 'serviceWorker');

// Setup global Notification mock (jsdom doesn't have it)
class MockNotification {
	static permission: string = 'default';
	static requestPermission = vi.fn().mockResolvedValue('default');
}
vi.stubGlobal('Notification', MockNotification);

describe('push-notifications utility', () => {
	beforeEach(() => {
		mockFetch.mockReset();
		MockNotification.permission = 'default';
		MockNotification.requestPermission = vi.fn().mockResolvedValue('default');
	});

	afterEach(() => {
		// Restore PushManager after each test
		if (originalPushManager) {
			Object.defineProperty(window, 'PushManager', originalPushManager);
		} else {
			delete (window as { PushManager?: unknown }).PushManager;
		}
		// Restore serviceWorker after each test
		if (originalServiceWorker) {
			Object.defineProperty(navigator, 'serviceWorker', originalServiceWorker);
		}
	});

	describe('isPushSupported', () => {
		it('returns true when serviceWorker and PushManager are available', () => {
			Object.defineProperty(navigator, 'serviceWorker', {
				value: {},
				writable: true,
				configurable: true
			});
			Object.defineProperty(window, 'PushManager', {
				value: class PushManager {},
				writable: true,
				configurable: true
			});

			expect(isPushSupported()).toBe(true);
		});

		it('returns false when PushManager is not available', () => {
			Object.defineProperty(navigator, 'serviceWorker', {
				value: {},
				writable: true,
				configurable: true
			});
			delete (window as { PushManager?: unknown }).PushManager;

			expect(isPushSupported()).toBe(false);
		});
	});

	describe('getPermissionState', () => {
		it('returns default when Notification permission is not set', () => {
			MockNotification.permission = 'default';
			expect(getPermissionState()).toBe(PERMISSION_STATES.DEFAULT);
		});

		it('returns granted when Notification permission is granted', () => {
			MockNotification.permission = 'granted';
			expect(getPermissionState()).toBe(PERMISSION_STATES.GRANTED);
		});

		it('returns denied when Notification permission is denied', () => {
			MockNotification.permission = 'denied';
			expect(getPermissionState()).toBe(PERMISSION_STATES.DENIED);
		});
	});

	describe('requestPermission', () => {
		it('calls Notification.requestPermission and returns result', async () => {
			MockNotification.requestPermission = vi.fn().mockResolvedValue('granted');

			const result = await requestPermission();

			expect(MockNotification.requestPermission).toHaveBeenCalled();
			expect(result).toBe('granted');
		});

		it('returns denied when user denies permission', async () => {
			MockNotification.requestPermission = vi.fn().mockResolvedValue('denied');

			const result = await requestPermission();

			expect(result).toBe('denied');
		});
	});

	describe('urlBase64ToUint8Array', () => {
		it('converts a base64url string to Uint8Array', () => {
			// "hello" in base64 is "aGVsbG8"
			const result = urlBase64ToUint8Array('aGVsbG8');

			expect(result).toBeInstanceOf(Uint8Array);
			// "hello" bytes: 104, 101, 108, 108, 111
			expect(Array.from(result)).toEqual([104, 101, 108, 108, 111]);
		});

		it('handles base64url with replaced characters (- and _)', () => {
			// Standard base64 uses + and /, base64url replaces with - and _
			const base64urlString = 'SGVsbG8tV29ybGQ';
			const result = urlBase64ToUint8Array(base64urlString);

			expect(result).toBeInstanceOf(Uint8Array);
			expect(result.length).toBeGreaterThan(0);
		});

		it('handles empty string', () => {
			const result = urlBase64ToUint8Array('');

			expect(result).toBeInstanceOf(Uint8Array);
			expect(result.length).toBe(0);
		});

		it('adds proper padding', () => {
			// "AB" in base64 is "QUI" (needs 1 pad char)
			const result = urlBase64ToUint8Array('QUI');

			expect(result).toBeInstanceOf(Uint8Array);
			expect(result.length).toBe(2);
		});
	});

	describe('subscribeToPush', () => {
		it('throws when push is not supported', async () => {
			delete (window as { PushManager?: unknown }).PushManager;

			await expect(subscribeToPush('test-key')).rejects.toThrow(
				'Push notifications are not supported'
			);
		});

		it('subscribes and extracts keys from subscription', async () => {
			const mockP256dh = new ArrayBuffer(65);
			const mockAuth = new ArrayBuffer(16);

			const mockSubscription = {
				endpoint: 'https://fcm.example.com/push/abc123',
				getKey: vi.fn((name: string) => {
					if (name === 'p256dh') return mockP256dh;
					if (name === 'auth') return mockAuth;
					return null;
				})
			};

			const mockPushManager = {
				subscribe: vi.fn().mockResolvedValue(mockSubscription)
			};

			Object.defineProperty(window, 'PushManager', {
				value: class PushManager {},
				writable: true,
				configurable: true
			});

			Object.defineProperty(navigator, 'serviceWorker', {
				value: {
					ready: Promise.resolve({ pushManager: mockPushManager })
				},
				writable: true,
				configurable: true
			});

			const result = await subscribeToPush('test-vapid-key');

			expect(result.endpoint).toBe('https://fcm.example.com/push/abc123');
			expect(result.keys.p256dh).toBeDefined();
			expect(result.keys.auth).toBeDefined();
			expect(mockPushManager.subscribe).toHaveBeenCalledWith(
				expect.objectContaining({
					userVisibleOnly: true
				})
			);
		});

		it('throws when keys are missing from subscription', async () => {
			const mockSubscription = {
				endpoint: 'https://fcm.example.com/push/abc123',
				getKey: vi.fn().mockReturnValue(null)
			};

			const mockPushManager = {
				subscribe: vi.fn().mockResolvedValue(mockSubscription)
			};

			Object.defineProperty(window, 'PushManager', {
				value: class PushManager {},
				writable: true,
				configurable: true
			});

			Object.defineProperty(navigator, 'serviceWorker', {
				value: {
					ready: Promise.resolve({ pushManager: mockPushManager })
				},
				writable: true,
				configurable: true
			});

			await expect(subscribeToPush('test-key')).rejects.toThrow(
				'Failed to extract encryption keys'
			);
		});
	});

	describe('saveSubscription', () => {
		it('sends subscription to API endpoint', async () => {
			mockFetch.mockResolvedValue({
				ok: true,
				status: 201
			});

			const subscription = {
				endpoint: 'https://fcm.example.com/push/abc',
				keys: { p256dh: 'key1', auth: 'secret1' }
			};

			const result = await saveSubscription(subscription);

			expect(result).toBe(true);
			expect(mockFetch).toHaveBeenCalledWith('/api/push', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(subscription)
			});
		});

		it('throws on API error', async () => {
			mockFetch.mockResolvedValue({
				ok: false,
				json: async () => ({ error: 'Server error' })
			});

			const subscription = {
				endpoint: 'https://fcm.example.com/push/abc',
				keys: { p256dh: 'key1', auth: 'secret1' }
			};

			await expect(saveSubscription(subscription)).rejects.toThrow('Server error');
		});

		it('throws generic error when API returns no error message', async () => {
			mockFetch.mockResolvedValue({
				ok: false,
				json: async () => ({})
			});

			const subscription = {
				endpoint: 'https://fcm.example.com/push/abc',
				keys: { p256dh: 'key1', auth: 'secret1' }
			};

			await expect(saveSubscription(subscription)).rejects.toThrow(
				'Failed to save push subscription'
			);
		});
	});

	describe('removeSubscription', () => {
		it('sends DELETE request to API endpoint', async () => {
			mockFetch.mockResolvedValue({
				ok: true,
				status: 200
			});

			const result = await removeSubscription('https://fcm.example.com/push/abc');

			expect(result).toBe(true);
			expect(mockFetch).toHaveBeenCalledWith('/api/push', {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ endpoint: 'https://fcm.example.com/push/abc' })
			});
		});

		it('throws on API error', async () => {
			mockFetch.mockResolvedValue({
				ok: false,
				json: async () => ({ error: 'Not found' })
			});

			await expect(removeSubscription('https://fcm.example.com/push/abc')).rejects.toThrow(
				'Not found'
			);
		});

		it('throws generic error when API returns no error message', async () => {
			mockFetch.mockResolvedValue({
				ok: false,
				json: async () => ({})
			});

			await expect(removeSubscription('https://fcm.example.com/push/abc')).rejects.toThrow(
				'Failed to remove push subscription'
			);
		});
	});

	describe('setupPushNotifications', () => {
		it('returns failure when push is not supported', async () => {
			delete (window as { PushManager?: unknown }).PushManager;

			const result = await setupPushNotifications('test-key');

			expect(result.success).toBe(false);
			expect(result.error).toBe('Push notifications are not supported in this browser');
		});

		it('returns failure when permission is denied', async () => {
			Object.defineProperty(window, 'PushManager', {
				value: class PushManager {},
				writable: true,
				configurable: true
			});

			MockNotification.permission = 'default';
			MockNotification.requestPermission = vi.fn().mockResolvedValue('denied');

			const result = await setupPushNotifications('test-key');

			expect(result.success).toBe(false);
			expect(result.error).toBe('Notification permission was not granted');
		});

		it('returns failure with error message when subscription fails', async () => {
			Object.defineProperty(window, 'PushManager', {
				value: class PushManager {},
				writable: true,
				configurable: true
			});

			MockNotification.permission = 'default';
			MockNotification.requestPermission = vi.fn().mockResolvedValue('granted');

			Object.defineProperty(navigator, 'serviceWorker', {
				value: {
					ready: Promise.reject(new Error('Service worker failed'))
				},
				writable: true,
				configurable: true
			});

			const result = await setupPushNotifications('test-key');

			expect(result.success).toBe(false);
			expect(result.error).toBe('Service worker failed');
		});

		it('returns success with subscription on full happy path', async () => {
			const mockP256dh = new ArrayBuffer(65);
			const mockAuth = new ArrayBuffer(16);

			const mockSubscription = {
				endpoint: 'https://fcm.example.com/push/xyz',
				getKey: vi.fn((name: string) => {
					if (name === 'p256dh') return mockP256dh;
					if (name === 'auth') return mockAuth;
					return null;
				})
			};

			Object.defineProperty(window, 'PushManager', {
				value: class PushManager {},
				writable: true,
				configurable: true
			});

			MockNotification.permission = 'default';
			MockNotification.requestPermission = vi.fn().mockResolvedValue('granted');

			Object.defineProperty(navigator, 'serviceWorker', {
				value: {
					ready: Promise.resolve({
						pushManager: {
							subscribe: vi.fn().mockResolvedValue(mockSubscription)
						}
					})
				},
				writable: true,
				configurable: true
			});

			mockFetch.mockResolvedValue({ ok: true, status: 201 });

			const result = await setupPushNotifications('test-vapid-key');

			expect(result.success).toBe(true);
			expect(result.subscription?.endpoint).toBe('https://fcm.example.com/push/xyz');
			expect(mockFetch).toHaveBeenCalledWith('/api/push', expect.any(Object));
		});

		it('returns failure when save to server fails', async () => {
			const mockP256dh = new ArrayBuffer(65);
			const mockAuth = new ArrayBuffer(16);

			const mockSubscription = {
				endpoint: 'https://fcm.example.com/push/xyz',
				getKey: vi.fn((name: string) => {
					if (name === 'p256dh') return mockP256dh;
					if (name === 'auth') return mockAuth;
					return null;
				})
			};

			Object.defineProperty(window, 'PushManager', {
				value: class PushManager {},
				writable: true,
				configurable: true
			});

			MockNotification.permission = 'default';
			MockNotification.requestPermission = vi.fn().mockResolvedValue('granted');

			Object.defineProperty(navigator, 'serviceWorker', {
				value: {
					ready: Promise.resolve({
						pushManager: {
							subscribe: vi.fn().mockResolvedValue(mockSubscription)
						}
					})
				},
				writable: true,
				configurable: true
			});

			mockFetch.mockResolvedValue({
				ok: false,
				json: async () => ({ error: 'Database error' })
			});

			const result = await setupPushNotifications('test-vapid-key');

			expect(result.success).toBe(false);
			expect(result.error).toBe('Database error');
		});
	});

	describe('PERMISSION_STATES constants', () => {
		it('has DEFAULT, GRANTED, and DENIED states', () => {
			expect(PERMISSION_STATES.DEFAULT).toBe('default');
			expect(PERMISSION_STATES.GRANTED).toBe('granted');
			expect(PERMISSION_STATES.DENIED).toBe('denied');
		});
	});
});
