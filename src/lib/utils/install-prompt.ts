/**
 * Install Prompt Utility
 *
 * Manages the PWA "Add to Home Screen" install prompt lifecycle.
 * Captures the browser's `beforeinstallprompt` event and provides
 * a controlled API for showing a custom install UX.
 *
 * Remembers user's dismissal preference in localStorage so the
 * prompt is not shown again after being explicitly dismissed.
 */

export const INSTALL_PROMPT_DISMISSED_KEY = 'pwa_install_prompt_dismissed';

/**
 * Result of calling prompt() on the deferred install event.
 */
export interface InstallPromptOutcome {
	outcome: 'accepted' | 'dismissed';
}

/**
 * Checks whether the user has previously dismissed the install prompt.
 */
export function isInstallPromptDismissed(): boolean {
	return localStorage.getItem(INSTALL_PROMPT_DISMISSED_KEY) === 'true';
}

/**
 * Persists the user's decision to dismiss the install prompt.
 */
export function dismissInstallPrompt(): void {
	localStorage.setItem(INSTALL_PROMPT_DISMISSED_KEY, 'true');
}

/**
 * Clears the dismissed preference, allowing the prompt to show again.
 * Useful for testing or if the user wants to reconsider.
 */
export function resetInstallPromptPreference(): void {
	localStorage.removeItem(INSTALL_PROMPT_DISMISSED_KEY);
}

/**
 * Checks whether the app is currently running in standalone (installed) mode.
 * Returns true if launched from home screen, false if in browser.
 */
export function isInstalledApp(): boolean {
	return window.matchMedia('(display-mode: standalone)').matches;
}

/**
 * Captures and stores the deferred install prompt event.
 * Must be called in an event listener for 'beforeinstallprompt'.
 *
 * @param event - The BeforeInstallPromptEvent from the browser
 * @returns The stored event for later use with triggerInstallPrompt
 */
export function captureInstallPrompt(event: Event): Event {
	event.preventDefault();
	return event;
}

/**
 * Triggers the browser's native install prompt using a previously captured event.
 *
 * @param event - The previously captured beforeinstallprompt event
 * @returns The user's response (accepted or dismissed), or null if unavailable
 */
export async function triggerInstallPrompt(event: Event): Promise<InstallPromptOutcome | null> {
	const installEvent = event as unknown as { prompt: () => Promise<InstallPromptOutcome> };
	if (!installEvent.prompt) return null;
	const result = await installEvent.prompt();
	return result;
}
