import { describe, it, expect, vi, beforeEach } from 'vitest';
import { load, actions } from './+page.server';

// Mock the notification server functions
vi.mock('$lib/server/notifications', () => ({
	fetchUserNotificationPreferences: vi.fn(),
	updateNotificationPreference: vi.fn()
}));

// Mock push subscription server functions
vi.mock('$lib/server/push-subscriptions', () => ({
	hasActivePushSubscription: vi.fn()
}));

// Set environment variable for tests
process.env.PUBLIC_VAPID_PUBLIC_KEY = 'test-vapid-public-key';

// Mock SvelteKit modules
vi.mock('@sveltejs/kit', () => ({
	redirect: vi.fn((status: number, location: string) => {
		throw new Error(`Redirect: ${status} ${location}`);
	}),
	fail: vi.fn((status: number, data: object) => ({ status, ...data }))
}));

import {
	fetchUserNotificationPreferences,
	updateNotificationPreference
} from '$lib/server/notifications';
import { hasActivePushSubscription } from '$lib/server/push-subscriptions';

describe('settings page load function', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	const createMockLocals = (hasSession = true) => ({
		supabase: {
			auth: {
				getSession: vi.fn().mockResolvedValue({
					data: {
						session: hasSession ? { user: { id: 'user-123' } } : null
					}
				})
			}
		}
	});

	it('loads notification preferences for authenticated user', async () => {
		const mockPreferences = [
			{
				notificationType: 'event_reminder' as const,
				pushEnabled: true,
				emailEnabled: true,
				inAppEnabled: true
			}
		];

		const mockLocals = createMockLocals();

		vi.mocked(fetchUserNotificationPreferences).mockResolvedValue(mockPreferences);
		vi.mocked(hasActivePushSubscription).mockResolvedValue(false);

		const result = await load({
			locals: mockLocals
		} as never);

		if (!result) {
			throw new Error('Load function returned undefined');
		}

		expect(result.preferences).toEqual(mockPreferences);
		expect(fetchUserNotificationPreferences).toHaveBeenCalledWith(mockLocals.supabase);
	});

	it('returns vapidPublicKey and hasPushSubscription', async () => {
		const mockLocals = createMockLocals();

		vi.mocked(fetchUserNotificationPreferences).mockResolvedValue([]);
		vi.mocked(hasActivePushSubscription).mockResolvedValue(true);

		const result = await load({
			locals: mockLocals
		} as never);

		if (!result) {
			throw new Error('Load function returned undefined');
		}

		expect(result.vapidPublicKey).toBe('test-vapid-public-key');
		expect(result.hasPushSubscription).toBe(true);
	});

	it('returns hasPushSubscription false when no subscription exists', async () => {
		const mockLocals = createMockLocals();

		vi.mocked(fetchUserNotificationPreferences).mockResolvedValue([]);
		vi.mocked(hasActivePushSubscription).mockResolvedValue(false);

		const result = await load({
			locals: mockLocals
		} as never);

		if (!result) {
			throw new Error('Load function returned undefined');
		}

		expect(result.hasPushSubscription).toBe(false);
	});

	it('redirects to login when not authenticated', async () => {
		const mockLocals = createMockLocals(false);

		await expect(
			load({
				locals: mockLocals
			} as never)
		).rejects.toThrow('Redirect: 303 /login');
	});

	it('returns empty array when fetching preferences fails', async () => {
		const mockLocals = createMockLocals();

		vi.mocked(fetchUserNotificationPreferences).mockRejectedValue(new Error('Database error'));
		vi.mocked(hasActivePushSubscription).mockResolvedValue(false);

		const result = await load({
			locals: mockLocals
		} as never);

		if (!result) {
			throw new Error('Load function returned undefined');
		}

		expect(result.preferences).toEqual([]);
	});

	it('defaults hasPushSubscription to false when check fails', async () => {
		const mockLocals = createMockLocals();

		vi.mocked(fetchUserNotificationPreferences).mockResolvedValue([]);
		vi.mocked(hasActivePushSubscription).mockRejectedValue(new Error('Check failed'));

		const result = await load({
			locals: mockLocals
		} as never);

		if (!result) {
			throw new Error('Load function returned undefined');
		}

		expect(result.hasPushSubscription).toBe(false);
	});
});

describe('settings page updatePreference action', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	const createMockRequest = (formData: FormData) => ({
		formData: async () => formData
	});

	const createMockLocals = (hasSession = true) => ({
		supabase: {
			auth: {
				getSession: vi.fn().mockResolvedValue({
					data: {
						session: hasSession ? { user: { id: 'user-123' } } : null
					}
				})
			}
		}
	});

	it('updates notification preference successfully', async () => {
		const formData = new FormData();
		formData.append('notificationType', 'event_reminder');
		formData.append('pushEnabled', 'false');
		formData.append('emailEnabled', 'true');
		formData.append('inAppEnabled', 'true');

		const mockLocals = createMockLocals();
		const mockRequest = createMockRequest(formData);

		vi.mocked(updateNotificationPreference).mockResolvedValue({
			notificationType: 'event_reminder',
			pushEnabled: false,
			emailEnabled: true,
			inAppEnabled: true
		});

		const result = await actions.updatePreference({
			locals: mockLocals,
			request: mockRequest
		} as never);

		expect(result).toEqual({ success: true });
		expect(updateNotificationPreference).toHaveBeenCalledWith(
			mockLocals.supabase,
			'event_reminder',
			false,
			true,
			true
		);
	});

	it('returns 401 when not authenticated', async () => {
		const formData = new FormData();
		formData.append('notificationType', 'event_reminder');
		formData.append('pushEnabled', 'true');
		formData.append('emailEnabled', 'true');
		formData.append('inAppEnabled', 'true');

		const mockLocals = createMockLocals(false);
		const mockRequest = createMockRequest(formData);

		const result = await actions.updatePreference({
			locals: mockLocals,
			request: mockRequest
		} as never);

		expect(result?.status).toBe(401);
	});

	it('returns 400 for invalid notification type', async () => {
		const formData = new FormData();
		formData.append('notificationType', 'invalid_type');
		formData.append('pushEnabled', 'true');
		formData.append('emailEnabled', 'true');
		formData.append('inAppEnabled', 'true');

		const mockLocals = createMockLocals();
		const mockRequest = createMockRequest(formData);

		const result = await actions.updatePreference({
			locals: mockLocals,
			request: mockRequest
		} as never);

		expect(result?.status).toBe(400);
	});

	it('returns 500 when update fails', async () => {
		const formData = new FormData();
		formData.append('notificationType', 'event_reminder');
		formData.append('pushEnabled', 'true');
		formData.append('emailEnabled', 'true');
		formData.append('inAppEnabled', 'true');

		const mockLocals = createMockLocals();
		const mockRequest = createMockRequest(formData);

		vi.mocked(updateNotificationPreference).mockRejectedValue(new Error('Database error'));

		const result = await actions.updatePreference({
			locals: mockLocals,
			request: mockRequest
		} as never);

		expect(result?.status).toBe(500);
	});

	it('handles boolean string conversion correctly', async () => {
		const formData = new FormData();
		formData.append('notificationType', 'new_message');
		formData.append('pushEnabled', 'false');
		formData.append('emailEnabled', 'false');
		formData.append('inAppEnabled', 'true');

		const mockLocals = createMockLocals();
		const mockRequest = createMockRequest(formData);

		vi.mocked(updateNotificationPreference).mockResolvedValue({
			notificationType: 'new_message',
			pushEnabled: false,
			emailEnabled: false,
			inAppEnabled: true
		});

		await actions.updatePreference({
			locals: mockLocals,
			request: mockRequest
		} as never);

		expect(updateNotificationPreference).toHaveBeenCalledWith(
			mockLocals.supabase,
			'new_message',
			false,
			false,
			true
		);
	});
});
