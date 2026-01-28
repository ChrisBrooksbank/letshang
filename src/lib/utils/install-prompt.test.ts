import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
	isInstallPromptDismissed,
	dismissInstallPrompt,
	resetInstallPromptPreference,
	isInstalledApp,
	captureInstallPrompt,
	triggerInstallPrompt,
	INSTALL_PROMPT_DISMISSED_KEY
} from './install-prompt';

describe('install-prompt utility', () => {
	let localStorageMock: Map<string, string>;

	beforeEach(() => {
		localStorageMock = new Map();
		vi.stubGlobal('localStorage', {
			getItem: (key: string) => localStorageMock.get(key) ?? null,
			setItem: (key: string, value: string) => {
				localStorageMock.set(key, value);
			},
			removeItem: (key: string) => {
				localStorageMock.delete(key);
			}
		});
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	describe('isInstallPromptDismissed', () => {
		it('returns false when no preference is stored', () => {
			expect(isInstallPromptDismissed()).toBe(false);
		});

		it('returns true when dismissed preference is stored', () => {
			localStorageMock.set(INSTALL_PROMPT_DISMISSED_KEY, 'true');
			expect(isInstallPromptDismissed()).toBe(true);
		});

		it('returns false when preference exists but is not "true"', () => {
			localStorageMock.set(INSTALL_PROMPT_DISMISSED_KEY, 'false');
			expect(isInstallPromptDismissed()).toBe(false);
		});
	});

	describe('dismissInstallPrompt', () => {
		it('stores dismissed preference in localStorage', () => {
			dismissInstallPrompt();
			expect(localStorageMock.get(INSTALL_PROMPT_DISMISSED_KEY)).toBe('true');
		});

		it('overwrites existing preference', () => {
			localStorageMock.set(INSTALL_PROMPT_DISMISSED_KEY, 'false');
			dismissInstallPrompt();
			expect(localStorageMock.get(INSTALL_PROMPT_DISMISSED_KEY)).toBe('true');
		});
	});

	describe('resetInstallPromptPreference', () => {
		it('removes dismissed preference from localStorage', () => {
			localStorageMock.set(INSTALL_PROMPT_DISMISSED_KEY, 'true');
			resetInstallPromptPreference();
			expect(localStorageMock.has(INSTALL_PROMPT_DISMISSED_KEY)).toBe(false);
		});

		it('does not throw when no preference exists', () => {
			expect(() => resetInstallPromptPreference()).not.toThrow();
		});
	});

	describe('isInstalledApp', () => {
		it('returns true when running in standalone mode', () => {
			vi.stubGlobal('window', {
				...globalThis.window,
				matchMedia: vi.fn().mockReturnValue({ matches: true })
			});
			expect(isInstalledApp()).toBe(true);
		});

		it('returns false when running in browser mode', () => {
			vi.stubGlobal('window', {
				...globalThis.window,
				matchMedia: vi.fn().mockReturnValue({ matches: false })
			});
			expect(isInstalledApp()).toBe(false);
		});
	});

	describe('captureInstallPrompt', () => {
		it('calls preventDefault on the event', () => {
			const mockPreventDefault = vi.fn();
			const event = { preventDefault: mockPreventDefault } as unknown as Event;
			captureInstallPrompt(event);
			expect(mockPreventDefault).toHaveBeenCalled();
		});

		it('returns the captured event', () => {
			const event = { preventDefault: vi.fn() } as unknown as Event;
			const result = captureInstallPrompt(event);
			expect(result).toBe(event);
		});
	});

	describe('triggerInstallPrompt', () => {
		it('calls prompt() on the event and returns the outcome', async () => {
			const mockOutcome = { outcome: 'accepted' as const };
			const event = {
				prompt: vi.fn().mockResolvedValue(mockOutcome)
			} as unknown as Event;

			const result = await triggerInstallPrompt(event);
			expect(result).toEqual(mockOutcome);
		});

		it('returns null when event has no prompt method', async () => {
			const event = {} as unknown as Event;
			const result = await triggerInstallPrompt(event);
			expect(result).toBeNull();
		});

		it('handles dismissed outcome', async () => {
			const mockOutcome = { outcome: 'dismissed' as const };
			const event = {
				prompt: vi.fn().mockResolvedValue(mockOutcome)
			} as unknown as Event;

			const result = await triggerInstallPrompt(event);
			expect(result?.outcome).toBe('dismissed');
		});
	});
});
