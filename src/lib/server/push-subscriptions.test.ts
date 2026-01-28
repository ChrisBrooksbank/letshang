import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
	savePushSubscription,
	removePushSubscription,
	hasActivePushSubscription,
	logPushDelivery,
	updateDeliveryStatus,
	fetchPushDeliveryLogs
} from './push-subscriptions';

// Mock Supabase client
const createMockSupabase = () => {
	const mockUpsert = vi.fn();
	const mockDelete = vi.fn();
	const mockSelect = vi.fn();
	const mockInsert = vi.fn();
	const mockUpdate = vi.fn();
	const mockLimit = vi.fn();
	const mockEq = vi.fn();
	const mockOrder = vi.fn();

	const chainable = {
		upsert: mockUpsert,
		delete: mockDelete,
		select: mockSelect,
		insert: mockInsert,
		update: mockUpdate,
		limit: mockLimit,
		eq: mockEq,
		order: mockOrder
	};

	// Make methods chainable
	mockUpsert.mockReturnValue({ data: null, error: null });
	mockDelete.mockReturnValue(chainable);
	mockSelect.mockReturnValue(chainable);
	mockInsert.mockReturnValue({ data: null, error: null });
	mockUpdate.mockReturnValue(chainable);
	mockLimit.mockReturnValue({ data: [], error: null });
	mockEq.mockReturnValue(chainable);
	mockOrder.mockReturnValue(chainable);

	const from = vi.fn().mockReturnValue(chainable);

	return {
		from,
		chainable,
		mocks: {
			upsert: mockUpsert,
			delete: mockDelete,
			select: mockSelect,
			insert: mockInsert,
			update: mockUpdate,
			limit: mockLimit,
			eq: mockEq,
			order: mockOrder
		}
	};
};

describe('push-subscriptions server functions', () => {
	let mockSupabase: ReturnType<typeof createMockSupabase>;

	beforeEach(() => {
		mockSupabase = createMockSupabase();
		vi.clearAllMocks();
	});

	describe('savePushSubscription', () => {
		it('saves subscription using upsert', async () => {
			mockSupabase.mocks.upsert.mockReturnValue({ data: null, error: null });

			const subscription = {
				endpoint: 'https://fcm.example.com/push/abc',
				keys: { p256dh: 'publickey123', auth: 'authsecret456' }
			};

			await savePushSubscription(
				mockSupabase as unknown as Parameters<typeof savePushSubscription>[0],
				subscription
			);

			expect(mockSupabase.from).toHaveBeenCalledWith('push_subscriptions');
			expect(mockSupabase.mocks.upsert).toHaveBeenCalledWith(
				expect.objectContaining({
					endpoint: 'https://fcm.example.com/push/abc',
					p256dh: 'publickey123',
					auth: 'authsecret456'
				}),
				expect.objectContaining({
					onConflict: 'endpoint',
					ignoreDuplicates: false
				})
			);
		});

		it('throws on database error', async () => {
			mockSupabase.mocks.upsert.mockReturnValue({
				data: null,
				error: { message: 'DB error' }
			});

			const subscription = {
				endpoint: 'https://fcm.example.com/push/abc',
				keys: { p256dh: 'key', auth: 'auth' }
			};

			await expect(
				savePushSubscription(
					mockSupabase as unknown as Parameters<typeof savePushSubscription>[0],
					subscription
				)
			).rejects.toThrow('Failed to save push subscription');
		});
	});

	describe('removePushSubscription', () => {
		it('deletes subscription by endpoint', async () => {
			const mockEq = vi.fn().mockReturnValue({ data: null, error: null });
			mockSupabase.mocks.delete.mockReturnValue({ eq: mockEq });

			await removePushSubscription(
				mockSupabase as unknown as Parameters<typeof removePushSubscription>[0],
				'https://fcm.example.com/push/abc'
			);

			expect(mockSupabase.from).toHaveBeenCalledWith('push_subscriptions');
			expect(mockEq).toHaveBeenCalledWith('endpoint', 'https://fcm.example.com/push/abc');
		});

		it('throws on database error', async () => {
			const mockEq = vi.fn().mockReturnValue({
				data: null,
				error: { message: 'DB error' }
			});
			mockSupabase.mocks.delete.mockReturnValue({ eq: mockEq });

			await expect(
				removePushSubscription(
					mockSupabase as unknown as Parameters<typeof removePushSubscription>[0],
					'https://fcm.example.com/push/abc'
				)
			).rejects.toThrow('Failed to remove push subscription');
		});
	});

	describe('hasActivePushSubscription', () => {
		it('returns true when subscriptions exist', async () => {
			mockSupabase.mocks.select.mockReturnValue({
				...mockSupabase.chainable,
				limit: vi.fn().mockReturnValue({
					data: [{ endpoint: 'https://fcm.example.com/push/abc' }],
					error: null
				})
			});

			const result = await hasActivePushSubscription(
				mockSupabase as unknown as Parameters<typeof hasActivePushSubscription>[0]
			);

			expect(result).toBe(true);
			expect(mockSupabase.from).toHaveBeenCalledWith('push_subscriptions');
		});

		it('returns false when no subscriptions exist', async () => {
			mockSupabase.mocks.select.mockReturnValue({
				...mockSupabase.chainable,
				limit: vi.fn().mockReturnValue({
					data: [],
					error: null
				})
			});

			const result = await hasActivePushSubscription(
				mockSupabase as unknown as Parameters<typeof hasActivePushSubscription>[0]
			);

			expect(result).toBe(false);
		});

		it('returns false when data is null', async () => {
			mockSupabase.mocks.select.mockReturnValue({
				...mockSupabase.chainable,
				limit: vi.fn().mockReturnValue({
					data: null,
					error: null
				})
			});

			const result = await hasActivePushSubscription(
				mockSupabase as unknown as Parameters<typeof hasActivePushSubscription>[0]
			);

			expect(result).toBe(false);
		});

		it('throws on database error', async () => {
			mockSupabase.mocks.select.mockReturnValue({
				...mockSupabase.chainable,
				limit: vi.fn().mockReturnValue({
					data: null,
					error: { message: 'DB error' }
				})
			});

			await expect(
				hasActivePushSubscription(
					mockSupabase as unknown as Parameters<typeof hasActivePushSubscription>[0]
				)
			).rejects.toThrow('Failed to check push subscriptions');
		});
	});

	describe('logPushDelivery', () => {
		it('inserts a delivery log entry', async () => {
			mockSupabase.mocks.insert.mockReturnValue({ data: null, error: null });

			await logPushDelivery(
				mockSupabase as unknown as Parameters<typeof logPushDelivery>[0],
				'user-123',
				'event_reminder',
				'https://fcm.example.com/push/abc',
				'pending'
			);

			expect(mockSupabase.from).toHaveBeenCalledWith('push_delivery_log');
			expect(mockSupabase.mocks.insert).toHaveBeenCalledWith(
				expect.objectContaining({
					user_id: 'user-123',
					notification_type: 'event_reminder',
					subscription_endpoint: 'https://fcm.example.com/push/abc',
					status: 'pending'
				})
			);
		});

		it('records delivered_at when status is delivered', async () => {
			mockSupabase.mocks.insert.mockReturnValue({ data: null, error: null });

			await logPushDelivery(
				mockSupabase as unknown as Parameters<typeof logPushDelivery>[0],
				'user-123',
				'event_reminder',
				'https://fcm.example.com/push/abc',
				'delivered'
			);

			expect(mockSupabase.mocks.insert).toHaveBeenCalledWith(
				expect.objectContaining({
					status: 'delivered',
					delivered_at: expect.any(String)
				})
			);
		});

		it('does not set delivered_at when status is pending', async () => {
			mockSupabase.mocks.insert.mockReturnValue({ data: null, error: null });

			await logPushDelivery(
				mockSupabase as unknown as Parameters<typeof logPushDelivery>[0],
				'user-123',
				'event_reminder',
				'https://fcm.example.com/push/abc',
				'pending'
			);

			expect(mockSupabase.mocks.insert).toHaveBeenCalledWith(
				expect.objectContaining({
					delivered_at: null
				})
			);
		});

		it('stores optional error message', async () => {
			mockSupabase.mocks.insert.mockReturnValue({ data: null, error: null });

			await logPushDelivery(
				mockSupabase as unknown as Parameters<typeof logPushDelivery>[0],
				'user-123',
				'event_reminder',
				'https://fcm.example.com/push/abc',
				'failed',
				'Endpoint expired'
			);

			expect(mockSupabase.mocks.insert).toHaveBeenCalledWith(
				expect.objectContaining({
					error_message: 'Endpoint expired'
				})
			);
		});

		it('sets error_message to null when not provided', async () => {
			mockSupabase.mocks.insert.mockReturnValue({ data: null, error: null });

			await logPushDelivery(
				mockSupabase as unknown as Parameters<typeof logPushDelivery>[0],
				'user-123',
				'event_reminder',
				'https://fcm.example.com/push/abc',
				'pending'
			);

			expect(mockSupabase.mocks.insert).toHaveBeenCalledWith(
				expect.objectContaining({
					error_message: null
				})
			);
		});

		it('throws on database error', async () => {
			mockSupabase.mocks.insert.mockReturnValue({
				data: null,
				error: { message: 'DB error' }
			});

			await expect(
				logPushDelivery(
					mockSupabase as unknown as Parameters<typeof logPushDelivery>[0],
					'user-123',
					'event_reminder',
					'https://fcm.example.com/push/abc',
					'pending'
				)
			).rejects.toThrow('Failed to log push delivery');
		});
	});

	describe('updateDeliveryStatus', () => {
		it('updates status to delivered with delivered_at timestamp', async () => {
			mockSupabase.mocks.update.mockReturnValue({
				...mockSupabase.chainable,
				eq: vi.fn().mockReturnValue({
					...mockSupabase.chainable,
					eq: vi.fn().mockReturnValue({
						...mockSupabase.chainable,
						eq: vi.fn().mockReturnValue({ data: null, error: null })
					})
				})
			});

			await updateDeliveryStatus(
				mockSupabase as unknown as Parameters<typeof updateDeliveryStatus>[0],
				'https://fcm.example.com/push/abc',
				'event_reminder',
				'delivered'
			);

			expect(mockSupabase.from).toHaveBeenCalledWith('push_delivery_log');
			expect(mockSupabase.mocks.update).toHaveBeenCalledWith(
				expect.objectContaining({
					status: 'delivered',
					delivered_at: expect.any(String)
				})
			);
		});

		it('updates status to failed with error message', async () => {
			mockSupabase.mocks.update.mockReturnValue({
				...mockSupabase.chainable,
				eq: vi.fn().mockReturnValue({
					...mockSupabase.chainable,
					eq: vi.fn().mockReturnValue({
						...mockSupabase.chainable,
						eq: vi.fn().mockReturnValue({ data: null, error: null })
					})
				})
			});

			await updateDeliveryStatus(
				mockSupabase as unknown as Parameters<typeof updateDeliveryStatus>[0],
				'https://fcm.example.com/push/abc',
				'event_reminder',
				'failed',
				'Endpoint unreachable'
			);

			expect(mockSupabase.mocks.update).toHaveBeenCalledWith(
				expect.objectContaining({
					status: 'failed',
					error_message: 'Endpoint unreachable'
				})
			);
		});

		it('throws on database error', async () => {
			mockSupabase.mocks.update.mockReturnValue({
				...mockSupabase.chainable,
				eq: vi.fn().mockReturnValue({
					...mockSupabase.chainable,
					eq: vi.fn().mockReturnValue({
						...mockSupabase.chainable,
						eq: vi.fn().mockReturnValue({ data: null, error: { message: 'DB error' } })
					})
				})
			});

			await expect(
				updateDeliveryStatus(
					mockSupabase as unknown as Parameters<typeof updateDeliveryStatus>[0],
					'https://fcm.example.com/push/abc',
					'event_reminder',
					'delivered'
				)
			).rejects.toThrow('Failed to update delivery status');
		});
	});

	describe('fetchPushDeliveryLogs', () => {
		it('fetches delivery logs with default limit', async () => {
			const mockData = [
				{
					notification_type: 'event_reminder',
					status: 'delivered',
					attempted_at: '2026-01-28T10:00:00Z',
					error_message: null
				}
			];

			mockSupabase.mocks.select.mockReturnValue({
				...mockSupabase.chainable,
				order: vi.fn().mockReturnValue({
					...mockSupabase.chainable,
					limit: vi.fn().mockReturnValue({ data: mockData, error: null })
				})
			});

			const result = await fetchPushDeliveryLogs(
				mockSupabase as unknown as Parameters<typeof fetchPushDeliveryLogs>[0]
			);

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual({
				notificationType: 'event_reminder',
				status: 'delivered',
				attemptedAt: '2026-01-28T10:00:00Z',
				errorMessage: null
			});
		});

		it('returns empty array when no logs exist', async () => {
			mockSupabase.mocks.select.mockReturnValue({
				...mockSupabase.chainable,
				order: vi.fn().mockReturnValue({
					...mockSupabase.chainable,
					limit: vi.fn().mockReturnValue({ data: null, error: null })
				})
			});

			const result = await fetchPushDeliveryLogs(
				mockSupabase as unknown as Parameters<typeof fetchPushDeliveryLogs>[0]
			);

			expect(result).toEqual([]);
		});

		it('accepts custom limit parameter', async () => {
			const mockLimit = vi.fn().mockReturnValue({ data: [], error: null });

			mockSupabase.mocks.select.mockReturnValue({
				...mockSupabase.chainable,
				order: vi.fn().mockReturnValue({
					...mockSupabase.chainable,
					limit: mockLimit
				})
			});

			await fetchPushDeliveryLogs(
				mockSupabase as unknown as Parameters<typeof fetchPushDeliveryLogs>[0],
				5
			);

			expect(mockLimit).toHaveBeenCalledWith(5);
		});

		it('throws on database error', async () => {
			mockSupabase.mocks.select.mockReturnValue({
				...mockSupabase.chainable,
				order: vi.fn().mockReturnValue({
					...mockSupabase.chainable,
					limit: vi.fn().mockReturnValue({ data: null, error: { message: 'DB error' } })
				})
			});

			await expect(
				fetchPushDeliveryLogs(
					mockSupabase as unknown as Parameters<typeof fetchPushDeliveryLogs>[0]
				)
			).rejects.toThrow('Failed to fetch push delivery logs');
		});
	});
});
