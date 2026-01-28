import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the server modules
vi.mock('$lib/server/push-subscriptions', () => ({
	savePushSubscription: vi.fn(),
	removePushSubscription: vi.fn()
}));

vi.mock('$lib/schemas/notifications', () => ({
	pushSubscriptionSchema: {
		safeParse: vi.fn()
	}
}));

import { savePushSubscription, removePushSubscription } from '$lib/server/push-subscriptions';
import { pushSubscriptionSchema } from '$lib/schemas/notifications';

// Helper to extract HTTP error status from SvelteKit HttpError
async function expectHttpError(fn: () => unknown, expectedStatus: number) {
	await expect(Promise.resolve(fn())).rejects.toSatisfy(
		(err: { status?: number }) => err.status === expectedStatus
	);
}

describe('Push Subscription API Endpoint', () => {
	const mockSupabase = {};
	const mockSession = {
		user: { id: 'user-123' }
	};

	const createMockLocals = (authenticated = true) => ({
		supabase: mockSupabase,
		session: authenticated ? mockSession : null
	});

	const createMockRequest = (body?: unknown) => ({
		json: vi.fn().mockResolvedValue(body)
	});

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('POST - Save subscription', () => {
		it('saves valid subscription successfully', async () => {
			const validSubscription = {
				endpoint: 'https://fcm.example.com/push/abc',
				keys: { p256dh: 'publickey', auth: 'authsecret' }
			};

			const mockParsed = {
				success: true,
				data: validSubscription
			};
			(pushSubscriptionSchema.safeParse as ReturnType<typeof vi.fn>).mockReturnValue(mockParsed);
			(savePushSubscription as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

			const handler = await import('./+server');
			const request = createMockRequest(validSubscription);
			const locals = createMockLocals();

			const response = await handler.POST({
				request,
				locals
			} as unknown as Parameters<typeof handler.POST>[0]);

			expect(savePushSubscription).toHaveBeenCalledWith(mockSupabase, validSubscription);
			expect(response.status).toBe(201);

			const body = JSON.parse(await response.text());
			expect(body.success).toBe(true);
		});

		it('returns 401 when not authenticated', async () => {
			const handler = await import('./+server');
			const request = createMockRequest({});
			const locals = createMockLocals(false);

			await expectHttpError(
				() => handler.POST({ request, locals } as unknown as Parameters<typeof handler.POST>[0]),
				401
			);
		});

		it('returns 400 on invalid JSON', async () => {
			const handler = await import('./+server');
			const request = { json: vi.fn().mockRejectedValue(new Error('Parse error')) };
			const locals = createMockLocals();

			await expectHttpError(
				() => handler.POST({ request, locals } as unknown as Parameters<typeof handler.POST>[0]),
				400
			);
		});

		it('returns 400 when validation fails', async () => {
			(pushSubscriptionSchema.safeParse as ReturnType<typeof vi.fn>).mockReturnValue({
				success: false,
				error: { message: 'Validation error' }
			});

			const handler = await import('./+server');
			const request = createMockRequest({ endpoint: 'bad' });
			const locals = createMockLocals();

			await expectHttpError(
				() => handler.POST({ request, locals } as unknown as Parameters<typeof handler.POST>[0]),
				400
			);
		});

		it('returns 500 when save fails', async () => {
			(pushSubscriptionSchema.safeParse as ReturnType<typeof vi.fn>).mockReturnValue({
				success: true,
				data: {
					endpoint: 'https://fcm.example.com/push/abc',
					keys: { p256dh: 'key', auth: 'auth' }
				}
			});
			(savePushSubscription as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('DB error'));

			const handler = await import('./+server');
			const request = createMockRequest({});
			const locals = createMockLocals();

			await expectHttpError(
				() => handler.POST({ request, locals } as unknown as Parameters<typeof handler.POST>[0]),
				500
			);
		});
	});

	describe('DELETE - Remove subscription', () => {
		it('removes subscription successfully', async () => {
			(removePushSubscription as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

			const handler = await import('./+server');
			const request = createMockRequest({
				endpoint: 'https://fcm.example.com/push/abc'
			});
			const locals = createMockLocals();

			const response = await handler.DELETE({
				request,
				locals
			} as unknown as Parameters<typeof handler.DELETE>[0]);

			expect(removePushSubscription).toHaveBeenCalledWith(
				mockSupabase,
				'https://fcm.example.com/push/abc'
			);

			const body = JSON.parse(await response.text());
			expect(body.success).toBe(true);
		});

		it('returns 401 when not authenticated', async () => {
			const handler = await import('./+server');
			const request = createMockRequest({});
			const locals = createMockLocals(false);

			await expectHttpError(
				() =>
					handler.DELETE({ request, locals } as unknown as Parameters<typeof handler.DELETE>[0]),
				401
			);
		});

		it('returns 400 on invalid JSON', async () => {
			const handler = await import('./+server');
			const request = { json: vi.fn().mockRejectedValue(new Error('Parse error')) };
			const locals = createMockLocals();

			await expectHttpError(
				() =>
					handler.DELETE({ request, locals } as unknown as Parameters<typeof handler.DELETE>[0]),
				400
			);
		});

		it('returns 400 when endpoint is missing', async () => {
			const handler = await import('./+server');
			const request = createMockRequest({});
			const locals = createMockLocals();

			await expectHttpError(
				() =>
					handler.DELETE({ request, locals } as unknown as Parameters<typeof handler.DELETE>[0]),
				400
			);
		});

		it('returns 400 when endpoint is not a string', async () => {
			const handler = await import('./+server');
			const request = createMockRequest({ endpoint: 123 });
			const locals = createMockLocals();

			await expectHttpError(
				() =>
					handler.DELETE({ request, locals } as unknown as Parameters<typeof handler.DELETE>[0]),
				400
			);
		});

		it('returns 500 when removal fails', async () => {
			(removePushSubscription as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('DB error'));

			const handler = await import('./+server');
			const request = createMockRequest({
				endpoint: 'https://fcm.example.com/push/abc'
			});
			const locals = createMockLocals();

			await expectHttpError(
				() =>
					handler.DELETE({ request, locals } as unknown as Parameters<typeof handler.DELETE>[0]),
				500
			);
		});
	});
});
