/**
 * Push Subscription API Endpoint
 *
 * Manages push notification subscriptions for the authenticated user.
 * POST - Save a push subscription
 * DELETE - Remove a push subscription
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { savePushSubscription, removePushSubscription } from '$lib/server/push-subscriptions';
import { pushSubscriptionSchema } from '$lib/schemas/notifications';

export const POST: RequestHandler = async ({ request, locals }) => {
	const session = locals.session;
	if (!session?.user) {
		throw error(401, 'Unauthorized');
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON in request body');
	}

	// Validate subscription data
	const result = pushSubscriptionSchema.safeParse(body);
	if (!result.success) {
		throw error(400, 'Invalid push subscription data');
	}

	try {
		await savePushSubscription(locals.supabase, result.data);
	} catch {
		throw error(500, 'Failed to save push subscription');
	}

	return json({ success: true }, { status: 201 });
};

export const DELETE: RequestHandler = async ({ request, locals }) => {
	const session = locals.session;
	if (!session?.user) {
		throw error(401, 'Unauthorized');
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Invalid JSON in request body');
	}

	const parsed = body as { endpoint?: string };
	if (!parsed.endpoint || typeof parsed.endpoint !== 'string') {
		throw error(400, 'Missing or invalid endpoint');
	}

	try {
		await removePushSubscription(locals.supabase, parsed.endpoint);
	} catch {
		throw error(500, 'Failed to remove push subscription');
	}

	return json({ success: true });
};
