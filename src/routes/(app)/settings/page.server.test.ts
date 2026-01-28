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

// Mock blocks server functions
vi.mock('$lib/server/blocks', () => ({
	getBlockedUsers: vi.fn(),
	blockUser: vi.fn(),
	unblockUser: vi.fn()
}));

// Mock messaging preference server functions
vi.mock('$lib/server/messaging-preferences', () => ({
	fetchMessagingPreference: vi.fn(),
	updateMessagingPreference: vi.fn()
}));

// Mock reports server functions
vi.mock('$lib/server/reports', () => ({
	submitReport: vi.fn()
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
import { getBlockedUsers, blockUser, unblockUser } from '$lib/server/blocks';
import {
	fetchMessagingPreference,
	updateMessagingPreference
} from '$lib/server/messaging-preferences';
import { submitReport } from '$lib/server/reports';

describe('settings page load function', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Default messaging preference mock for all load tests
		vi.mocked(fetchMessagingPreference).mockResolvedValue({ allowDmFrom: 'anyone' });
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
		vi.mocked(getBlockedUsers).mockResolvedValue([]);

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
		vi.mocked(getBlockedUsers).mockResolvedValue([]);

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
		vi.mocked(getBlockedUsers).mockResolvedValue([]);

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
		vi.mocked(getBlockedUsers).mockResolvedValue([]);

		const result = await load({
			locals: mockLocals
		} as never);

		if (!result) {
			throw new Error('Load function returned undefined');
		}

		expect(result.preferences).toEqual([]);
	});

	it('returns empty array when fetching blocked users fails', async () => {
		const mockLocals = createMockLocals();

		vi.mocked(fetchUserNotificationPreferences).mockResolvedValue([]);
		vi.mocked(hasActivePushSubscription).mockResolvedValue(false);
		vi.mocked(getBlockedUsers).mockRejectedValue(new Error('Database error'));

		const result = await load({
			locals: mockLocals
		} as never);

		if (!result) {
			throw new Error('Load function returned undefined');
		}

		expect(result.blockedUsers).toEqual([]);
	});

	it('loads blocked users for authenticated user', async () => {
		const mockLocals = createMockLocals();
		const mockBlockedUsers = [
			{
				id: 'block-1',
				blockedId: 'user-456',
				displayName: 'Jane Doe',
				reason: 'Spam',
				blockedAt: '2026-01-28T12:00:00Z'
			}
		];

		vi.mocked(fetchUserNotificationPreferences).mockResolvedValue([]);
		vi.mocked(hasActivePushSubscription).mockResolvedValue(false);
		vi.mocked(getBlockedUsers).mockResolvedValue(mockBlockedUsers);

		const result = await load({
			locals: mockLocals
		} as never);

		if (!result) {
			throw new Error('Load function returned undefined');
		}

		expect(result.blockedUsers).toEqual(mockBlockedUsers);
		expect(getBlockedUsers).toHaveBeenCalledWith(mockLocals.supabase);
	});

	it('defaults hasPushSubscription to false when check fails', async () => {
		const mockLocals = createMockLocals();

		vi.mocked(fetchUserNotificationPreferences).mockResolvedValue([]);
		vi.mocked(hasActivePushSubscription).mockRejectedValue(new Error('Check failed'));
		vi.mocked(getBlockedUsers).mockResolvedValue([]);

		const result = await load({
			locals: mockLocals
		} as never);

		if (!result) {
			throw new Error('Load function returned undefined');
		}

		expect(result.hasPushSubscription).toBe(false);
	});

	it('loads messaging preference for authenticated user', async () => {
		const mockLocals = createMockLocals();

		vi.mocked(fetchUserNotificationPreferences).mockResolvedValue([]);
		vi.mocked(hasActivePushSubscription).mockResolvedValue(false);
		vi.mocked(getBlockedUsers).mockResolvedValue([]);
		vi.mocked(fetchMessagingPreference).mockResolvedValue({ allowDmFrom: 'connections' });

		const result = await load({
			locals: mockLocals
		} as never);

		if (!result) {
			throw new Error('Load function returned undefined');
		}

		expect(result.messagingPreference).toEqual({ allowDmFrom: 'connections' });
		expect(fetchMessagingPreference).toHaveBeenCalledWith(mockLocals.supabase);
	});

	it('returns default messaging preference when fetch fails', async () => {
		const mockLocals = createMockLocals();

		vi.mocked(fetchUserNotificationPreferences).mockResolvedValue([]);
		vi.mocked(hasActivePushSubscription).mockResolvedValue(false);
		vi.mocked(getBlockedUsers).mockResolvedValue([]);
		vi.mocked(fetchMessagingPreference).mockRejectedValue(new Error('Database error'));

		const result = await load({
			locals: mockLocals
		} as never);

		if (!result) {
			throw new Error('Load function returned undefined');
		}

		expect(result.messagingPreference).toEqual({ allowDmFrom: 'anyone' });
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

describe('settings page blockUser action', () => {
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

	it('blocks a user successfully', async () => {
		const formData = new FormData();
		formData.append('blockedId', '550e8400-e29b-41d4-a716-446655440000');
		formData.append('reason', 'Unwanted contact');

		const mockLocals = createMockLocals();
		const mockRequest = createMockRequest(formData);

		vi.mocked(blockUser).mockResolvedValue({
			id: 'block-id',
			blocker_id: 'user-123',
			blocked_id: '550e8400-e29b-41d4-a716-446655440000',
			blocked_at: '2026-01-28T12:00:00Z'
		});

		const result = await actions.blockUser({
			locals: mockLocals,
			request: mockRequest
		} as never);

		expect(result).toEqual({ success: true });
		expect(blockUser).toHaveBeenCalledWith(
			mockLocals.supabase,
			'550e8400-e29b-41d4-a716-446655440000',
			'Unwanted contact'
		);
	});

	it('blocks a user without reason', async () => {
		const formData = new FormData();
		formData.append('blockedId', '550e8400-e29b-41d4-a716-446655440000');
		formData.append('reason', '');

		const mockLocals = createMockLocals();
		const mockRequest = createMockRequest(formData);

		vi.mocked(blockUser).mockResolvedValue({
			id: 'block-id',
			blocker_id: 'user-123',
			blocked_id: '550e8400-e29b-41d4-a716-446655440000',
			blocked_at: '2026-01-28T12:00:00Z'
		});

		const result = await actions.blockUser({
			locals: mockLocals,
			request: mockRequest
		} as never);

		expect(result).toEqual({ success: true });
		expect(blockUser).toHaveBeenCalledWith(
			mockLocals.supabase,
			'550e8400-e29b-41d4-a716-446655440000',
			undefined
		);
	});

	it('returns 401 when not authenticated', async () => {
		const formData = new FormData();
		formData.append('blockedId', '550e8400-e29b-41d4-a716-446655440000');

		const mockLocals = createMockLocals(false);
		const mockRequest = createMockRequest(formData);

		const result = await actions.blockUser({
			locals: mockLocals,
			request: mockRequest
		} as never);

		expect(result?.status).toBe(401);
	});

	it('returns 400 for invalid blockedId', async () => {
		const formData = new FormData();
		formData.append('blockedId', 'not-a-uuid');

		const mockLocals = createMockLocals();
		const mockRequest = createMockRequest(formData);

		const result = await actions.blockUser({
			locals: mockLocals,
			request: mockRequest
		} as never);

		expect(result?.status).toBe(400);
	});

	it('returns 500 when block fails', async () => {
		const formData = new FormData();
		formData.append('blockedId', '550e8400-e29b-41d4-a716-446655440000');

		const mockLocals = createMockLocals();
		const mockRequest = createMockRequest(formData);

		vi.mocked(blockUser).mockRejectedValue(new Error('User is already blocked'));

		const result = await actions.blockUser({
			locals: mockLocals,
			request: mockRequest
		} as never);

		expect(result?.status).toBe(500);
		expect(result?.error).toBe('User is already blocked');
	});
});

describe('settings page unblockUser action', () => {
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

	it('unblocks a user successfully', async () => {
		const formData = new FormData();
		formData.append('blockedId', '550e8400-e29b-41d4-a716-446655440000');

		const mockLocals = createMockLocals();
		const mockRequest = createMockRequest(formData);

		vi.mocked(unblockUser).mockResolvedValue();

		const result = await actions.unblockUser({
			locals: mockLocals,
			request: mockRequest
		} as never);

		expect(result).toEqual({ success: true });
		expect(unblockUser).toHaveBeenCalledWith(
			mockLocals.supabase,
			'550e8400-e29b-41d4-a716-446655440000'
		);
	});

	it('returns 401 when not authenticated', async () => {
		const formData = new FormData();
		formData.append('blockedId', '550e8400-e29b-41d4-a716-446655440000');

		const mockLocals = createMockLocals(false);
		const mockRequest = createMockRequest(formData);

		const result = await actions.unblockUser({
			locals: mockLocals,
			request: mockRequest
		} as never);

		expect(result?.status).toBe(401);
	});

	it('returns 400 for invalid blockedId', async () => {
		const formData = new FormData();
		formData.append('blockedId', 'invalid-id');

		const mockLocals = createMockLocals();
		const mockRequest = createMockRequest(formData);

		const result = await actions.unblockUser({
			locals: mockLocals,
			request: mockRequest
		} as never);

		expect(result?.status).toBe(400);
	});

	it('returns 500 when unblock fails', async () => {
		const formData = new FormData();
		formData.append('blockedId', '550e8400-e29b-41d4-a716-446655440000');

		const mockLocals = createMockLocals();
		const mockRequest = createMockRequest(formData);

		vi.mocked(unblockUser).mockRejectedValue(new Error('User was not blocked'));

		const result = await actions.unblockUser({
			locals: mockLocals,
			request: mockRequest
		} as never);

		expect(result?.status).toBe(500);
		expect(result?.error).toBe('User was not blocked');
	});
});

describe('settings page updateMessagingPreference action', () => {
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

	it('updates messaging preference successfully', async () => {
		const formData = new FormData();
		formData.append('allowDmFrom', 'connections');

		const mockLocals = createMockLocals();
		const mockRequest = createMockRequest(formData);

		vi.mocked(updateMessagingPreference).mockResolvedValue({ allowDmFrom: 'connections' });

		const result = await actions.updateMessagingPreference({
			locals: mockLocals,
			request: mockRequest
		} as never);

		expect(result).toEqual({ success: true });
		expect(updateMessagingPreference).toHaveBeenCalledWith(mockLocals.supabase, 'connections');
	});

	it('updates to all valid permission levels', async () => {
		const levels = ['anyone', 'connections', 'attendees', 'organizers'];

		for (const level of levels) {
			const formData = new FormData();
			formData.append('allowDmFrom', level);

			const mockLocals = createMockLocals();
			const mockRequest = createMockRequest(formData);

			vi.mocked(updateMessagingPreference).mockResolvedValue({
				allowDmFrom: level as never
			});

			const result = await actions.updateMessagingPreference({
				locals: mockLocals,
				request: mockRequest
			} as never);

			expect(result).toEqual({ success: true });
		}
	});

	it('returns 401 when not authenticated', async () => {
		const formData = new FormData();
		formData.append('allowDmFrom', 'anyone');

		const mockLocals = createMockLocals(false);
		const mockRequest = createMockRequest(formData);

		const result = await actions.updateMessagingPreference({
			locals: mockLocals,
			request: mockRequest
		} as never);

		expect(result?.status).toBe(401);
	});

	it('returns 400 for invalid permission level', async () => {
		const formData = new FormData();
		formData.append('allowDmFrom', 'invalid_level');

		const mockLocals = createMockLocals();
		const mockRequest = createMockRequest(formData);

		const result = await actions.updateMessagingPreference({
			locals: mockLocals,
			request: mockRequest
		} as never);

		expect(result?.status).toBe(400);
	});

	it('returns 400 for missing allowDmFrom field', async () => {
		const formData = new FormData();

		const mockLocals = createMockLocals();
		const mockRequest = createMockRequest(formData);

		const result = await actions.updateMessagingPreference({
			locals: mockLocals,
			request: mockRequest
		} as never);

		expect(result?.status).toBe(400);
	});

	it('returns 500 when update fails', async () => {
		const formData = new FormData();
		formData.append('allowDmFrom', 'organizers');

		const mockLocals = createMockLocals();
		const mockRequest = createMockRequest(formData);

		vi.mocked(updateMessagingPreference).mockRejectedValue(new Error('Database error'));

		const result = await actions.updateMessagingPreference({
			locals: mockLocals,
			request: mockRequest
		} as never);

		expect(result?.status).toBe(500);
		expect(result?.error).toBe('Failed to update messaging preferences');
	});
});

describe('settings page reportUser action', () => {
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

	it('submits a report successfully with all fields', async () => {
		const formData = new FormData();
		formData.append('reportedUserId', '550e8400-e29b-41d4-a716-446655440000');
		formData.append('category', 'harassment');
		formData.append('context', 'Sent threatening messages');
		formData.append('additionalDetails', 'This happened multiple times');

		const mockLocals = createMockLocals();
		const mockRequest = createMockRequest(formData);

		vi.mocked(submitReport).mockResolvedValue({
			id: 'report-id',
			reporter_id: 'user-123',
			reported_user_id: '550e8400-e29b-41d4-a716-446655440000',
			category: 'harassment',
			status: 'pending',
			reported_at: '2026-01-28T12:00:00Z'
		});

		const result = await actions.reportUser({
			locals: mockLocals,
			request: mockRequest
		} as never);

		expect(result).toEqual({ success: true });
		expect(submitReport).toHaveBeenCalledWith(
			mockLocals.supabase,
			'550e8400-e29b-41d4-a716-446655440000',
			'harassment',
			'Sent threatening messages',
			'This happened multiple times'
		);
	});

	it('submits a report with only required fields', async () => {
		const formData = new FormData();
		formData.append('reportedUserId', '550e8400-e29b-41d4-a716-446655440000');
		formData.append('category', 'spam');
		formData.append('context', '');
		formData.append('additionalDetails', '');

		const mockLocals = createMockLocals();
		const mockRequest = createMockRequest(formData);

		vi.mocked(submitReport).mockResolvedValue({
			id: 'report-id',
			reporter_id: 'user-123',
			reported_user_id: '550e8400-e29b-41d4-a716-446655440000',
			category: 'spam',
			status: 'pending',
			reported_at: '2026-01-28T12:00:00Z'
		});

		const result = await actions.reportUser({
			locals: mockLocals,
			request: mockRequest
		} as never);

		expect(result).toEqual({ success: true });
		expect(submitReport).toHaveBeenCalledWith(
			mockLocals.supabase,
			'550e8400-e29b-41d4-a716-446655440000',
			'spam',
			undefined,
			undefined
		);
	});

	it('returns 401 when not authenticated', async () => {
		const formData = new FormData();
		formData.append('reportedUserId', '550e8400-e29b-41d4-a716-446655440000');
		formData.append('category', 'harassment');

		const mockLocals = createMockLocals(false);
		const mockRequest = createMockRequest(formData);

		const result = await actions.reportUser({
			locals: mockLocals,
			request: mockRequest
		} as never);

		expect(result?.status).toBe(401);
	});

	it('returns 400 for invalid reportedUserId', async () => {
		const formData = new FormData();
		formData.append('reportedUserId', 'not-a-uuid');
		formData.append('category', 'harassment');

		const mockLocals = createMockLocals();
		const mockRequest = createMockRequest(formData);

		const result = await actions.reportUser({
			locals: mockLocals,
			request: mockRequest
		} as never);

		expect(result?.status).toBe(400);
	});

	it('returns 400 for invalid category', async () => {
		const formData = new FormData();
		formData.append('reportedUserId', '550e8400-e29b-41d4-a716-446655440000');
		formData.append('category', 'invalid_category');

		const mockLocals = createMockLocals();
		const mockRequest = createMockRequest(formData);

		const result = await actions.reportUser({
			locals: mockLocals,
			request: mockRequest
		} as never);

		expect(result?.status).toBe(400);
	});

	it('returns 400 for missing category', async () => {
		const formData = new FormData();
		formData.append('reportedUserId', '550e8400-e29b-41d4-a716-446655440000');

		const mockLocals = createMockLocals();
		const mockRequest = createMockRequest(formData);

		const result = await actions.reportUser({
			locals: mockLocals,
			request: mockRequest
		} as never);

		expect(result?.status).toBe(400);
	});

	it('returns 500 when report submission fails', async () => {
		const formData = new FormData();
		formData.append('reportedUserId', '550e8400-e29b-41d4-a716-446655440000');
		formData.append('category', 'safety');

		const mockLocals = createMockLocals();
		const mockRequest = createMockRequest(formData);

		vi.mocked(submitReport).mockRejectedValue(new Error('Cannot report yourself'));

		const result = await actions.reportUser({
			locals: mockLocals,
			request: mockRequest
		} as never);

		expect(result?.status).toBe(500);
		expect(result?.error).toBe('Cannot report yourself');
	});

	it('handles generic error without message', async () => {
		const formData = new FormData();
		formData.append('reportedUserId', '550e8400-e29b-41d4-a716-446655440000');
		formData.append('category', 'inappropriate');

		const mockLocals = createMockLocals();
		const mockRequest = createMockRequest(formData);

		vi.mocked(submitReport).mockRejectedValue('unknown error');

		const result = await actions.reportUser({
			locals: mockLocals,
			request: mockRequest
		} as never);

		expect(result?.status).toBe(500);
		expect(result?.error).toBe('Failed to submit report');
	});
});
