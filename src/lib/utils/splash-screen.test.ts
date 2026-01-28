import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
	hideSplashScreen,
	isSplashVisible,
	resetSplashStartTime,
	SPLASH_MIN_DURATION_MS,
	SPLASH_ELEMENT_ID
} from './splash-screen';

/**
 * Creates a mock splash screen element in the DOM.
 */
function createSplashElement(hidden = false): HTMLElement {
	const el = document.createElement('div');
	el.id = SPLASH_ELEMENT_ID;
	if (hidden) el.classList.add('hidden');
	document.body.appendChild(el);
	return el;
}

/**
 * Removes the splash element from the DOM if present.
 */
function removeSplashElement(): void {
	const el = document.getElementById(SPLASH_ELEMENT_ID);
	if (el) el.remove();
}

describe('splash-screen utility', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		removeSplashElement();
		resetSplashStartTime();
	});

	afterEach(() => {
		vi.useRealTimers();
		removeSplashElement();
	});

	describe('SPLASH_MIN_DURATION_MS', () => {
		it('is set to 800ms', () => {
			expect(SPLASH_MIN_DURATION_MS).toBe(800);
		});
	});

	describe('SPLASH_ELEMENT_ID', () => {
		it('matches the element ID used in app.html', () => {
			expect(SPLASH_ELEMENT_ID).toBe('splash-screen');
		});
	});

	describe('isSplashVisible', () => {
		it('returns false when splash element does not exist', () => {
			expect(isSplashVisible()).toBe(false);
		});

		it('returns true when splash element exists without hidden class', () => {
			createSplashElement(false);
			expect(isSplashVisible()).toBe(true);
		});

		it('returns false when splash element has hidden class', () => {
			createSplashElement(true);
			expect(isSplashVisible()).toBe(false);
		});
	});

	describe('resetSplashStartTime', () => {
		it('resets start time so minimum duration is enforced again', () => {
			const el = createSplashElement(false);
			// Advance past minimum duration
			vi.advanceTimersByTime(SPLASH_MIN_DURATION_MS + 100);

			// Reset start time to current (simulates fresh page load)
			resetSplashStartTime();

			// Hide should now defer because min duration hasn't elapsed from reset
			hideSplashScreen();
			expect(el.classList.contains('hidden')).toBe(false);

			// Advance past minimum duration from reset
			vi.advanceTimersByTime(SPLASH_MIN_DURATION_MS);
			expect(el.classList.contains('hidden')).toBe(true);
		});
	});

	describe('hideSplashScreen', () => {
		it('is a no-op when splash element does not exist', () => {
			// Should not throw
			hideSplashScreen();
			expect(isSplashVisible()).toBe(false);
		});

		it('adds hidden class to the splash element', () => {
			const el = createSplashElement(false);
			// Advance time past the minimum duration
			vi.advanceTimersByTime(SPLASH_MIN_DURATION_MS + 100);
			hideSplashScreen();
			expect(el.classList.contains('hidden')).toBe(true);
		});

		it('defers hiding if minimum duration has not elapsed', () => {
			const el = createSplashElement(false);
			// Call hide immediately (before min duration)
			hideSplashScreen();
			// Element should still be visible because setTimeout is pending
			// (fake timers haven't advanced)
			expect(el.classList.contains('hidden')).toBe(false);

			// Advance past the minimum duration
			vi.advanceTimersByTime(SPLASH_MIN_DURATION_MS);
			expect(el.classList.contains('hidden')).toBe(true);
		});

		it('hides immediately when minimum duration has already passed', () => {
			const el = createSplashElement(false);
			// Advance past minimum duration before calling hide
			vi.advanceTimersByTime(SPLASH_MIN_DURATION_MS + 100);
			hideSplashScreen();
			expect(el.classList.contains('hidden')).toBe(true);
		});

		it('is idempotent — calling hide multiple times is safe', () => {
			const el = createSplashElement(false);
			vi.advanceTimersByTime(SPLASH_MIN_DURATION_MS + 100);
			hideSplashScreen();
			hideSplashScreen();
			expect(el.classList.contains('hidden')).toBe(true);
		});
	});
});
