/**
 * Splash screen utility — manages the branded loading screen lifecycle.
 *
 * The splash screen is rendered as static HTML in app.html so it displays
 * instantly before any JavaScript loads. This utility hides it once the
 * SvelteKit app has hydrated and is ready.
 *
 * Minimum display duration prevents a jarring flash on fast loads.
 */

/** Minimum time the splash screen stays visible (ms). */
const SPLASH_MIN_DURATION_MS = 800;

/** ID of the splash screen element in app.html. */
const SPLASH_ELEMENT_ID = 'splash-screen';

/**
 * Returns the splash screen DOM element, or null if not found.
 */
function getSplashElement(): HTMLElement | null {
	return document.getElementById(SPLASH_ELEMENT_ID);
}

/**
 * Hides the splash screen with a smooth opacity fade-out.
 * Respects the minimum display duration so the brand is always visible
 * for at least SPLASH_MIN_DURATION_MS.
 *
 * If the element has already been removed or hidden, this is a no-op.
 */
function hideSplashScreen(): void {
	const el = getSplashElement();
	if (!el) return;

	const elapsed = Date.now() - splashStartTime;
	const remaining = Math.max(0, SPLASH_MIN_DURATION_MS - elapsed);

	const apply = () => {
		el.classList.add('hidden');
	};

	if (remaining > 0) {
		globalThis.setTimeout(apply, remaining);
	} else {
		apply();
	}
}

/**
 * Returns true if the splash screen element is currently visible.
 */
function isSplashVisible(): boolean {
	const el = getSplashElement();
	if (!el) return false;
	return !el.classList.contains('hidden');
}

/**
 * Timestamp when the splash screen was first shown (page load).
 * Captured immediately so the minimum duration timer starts from first paint.
 */
let splashStartTime: number = Date.now();

/**
 * Resets the splash start time to now. Used in tests to simulate
 * the splash screen having just been shown.
 */
function resetSplashStartTime(): void {
	splashStartTime = Date.now();
}

export {
	hideSplashScreen,
	isSplashVisible,
	resetSplashStartTime,
	SPLASH_MIN_DURATION_MS,
	SPLASH_ELEMENT_ID
};
