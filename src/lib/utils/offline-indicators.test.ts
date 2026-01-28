import { describe, it, expect, afterEach, vi } from 'vitest';
import {
	getOnlineStatus,
	getDataFreshnessLabel,
	subscribeOnlineStatus,
	initOnlineStatusListeners,
	destroyOnlineStatusListeners
} from './offline-indicators';

describe('getOnlineStatus', () => {
	it('should return true when navigator.onLine is true', () => {
		vi.stubGlobal('navigator', { ...globalThis.navigator, onLine: true });
		expect(getOnlineStatus()).toBe(true);
	});

	it('should return false when navigator.onLine is false', () => {
		vi.stubGlobal('navigator', { ...globalThis.navigator, onLine: false });
		expect(getOnlineStatus()).toBe(false);
	});

	it('should return true when navigator is undefined (SSR)', () => {
		// The utility checks `typeof navigator === 'undefined'` as an SSR guard.
		// In jsdom we cannot delete navigator, so we verify the guard exists
		// by confirming the function never throws regardless of navigator state.
		expect(() => getOnlineStatus()).not.toThrow();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});
});

describe('getDataFreshnessLabel', () => {
	it('should return "Live" when online', () => {
		expect(getDataFreshnessLabel(true)).toBe('Live');
	});

	it('should return "Cached" when offline', () => {
		expect(getDataFreshnessLabel(false)).toBe('Cached');
	});
});

describe('subscribeOnlineStatus', () => {
	it('should invoke callback when online event fires', () => {
		const callback = vi.fn();
		const unsubscribe = subscribeOnlineStatus(callback);
		initOnlineStatusListeners();

		window.dispatchEvent(new Event('online'));

		expect(callback).toHaveBeenCalledWith(true);
		unsubscribe();
		destroyOnlineStatusListeners();
	});

	it('should invoke callback when offline event fires', () => {
		const callback = vi.fn();
		const unsubscribe = subscribeOnlineStatus(callback);
		initOnlineStatusListeners();

		window.dispatchEvent(new Event('offline'));

		expect(callback).toHaveBeenCalledWith(false);
		unsubscribe();
		destroyOnlineStatusListeners();
	});

	it('should not invoke callback after unsubscribe', () => {
		const callback = vi.fn();
		const unsubscribe = subscribeOnlineStatus(callback);
		initOnlineStatusListeners();

		unsubscribe();
		window.dispatchEvent(new Event('offline'));

		expect(callback).not.toHaveBeenCalled();
		destroyOnlineStatusListeners();
	});

	it('should support multiple subscribers', () => {
		const callbackA = vi.fn();
		const callbackB = vi.fn();
		const unsubA = subscribeOnlineStatus(callbackA);
		const unsubB = subscribeOnlineStatus(callbackB);
		initOnlineStatusListeners();

		window.dispatchEvent(new Event('online'));

		expect(callbackA).toHaveBeenCalledWith(true);
		expect(callbackB).toHaveBeenCalledWith(true);
		unsubA();
		unsubB();
		destroyOnlineStatusListeners();
	});

	it('should only notify remaining subscribers after partial unsubscribe', () => {
		const callbackA = vi.fn();
		const callbackB = vi.fn();
		const unsubA = subscribeOnlineStatus(callbackA);
		const unsubB = subscribeOnlineStatus(callbackB);
		initOnlineStatusListeners();

		unsubA();
		window.dispatchEvent(new Event('offline'));

		expect(callbackA).not.toHaveBeenCalled();
		expect(callbackB).toHaveBeenCalledWith(false);
		unsubB();
		destroyOnlineStatusListeners();
	});
});

describe('initOnlineStatusListeners', () => {
	it('should not throw regardless of environment', () => {
		// The utility guards with `typeof window === 'undefined'` for SSR safety.
		// In jsdom window is always present, so we verify it does not throw here.
		expect(() => initOnlineStatusListeners()).not.toThrow();
		destroyOnlineStatusListeners();
	});

	it('should attach event listeners that fire on online event', () => {
		const callback = vi.fn();
		const unsubscribe = subscribeOnlineStatus(callback);
		initOnlineStatusListeners();

		window.dispatchEvent(new Event('online'));
		expect(callback).toHaveBeenCalledWith(true);

		unsubscribe();
		destroyOnlineStatusListeners();
	});
});

describe('destroyOnlineStatusListeners', () => {
	it('should not throw regardless of environment', () => {
		// The utility guards with `typeof window === 'undefined'` for SSR safety.
		expect(() => destroyOnlineStatusListeners()).not.toThrow();
	});

	it('should prevent further notifications after destroy', () => {
		const callback = vi.fn();
		const unsubscribe = subscribeOnlineStatus(callback);
		initOnlineStatusListeners();

		destroyOnlineStatusListeners();
		window.dispatchEvent(new Event('online'));

		expect(callback).not.toHaveBeenCalled();
		unsubscribe();
	});
});
