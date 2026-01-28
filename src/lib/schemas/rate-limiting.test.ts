import { describe, it, expect } from 'vitest';
import {
	rateLimitActionEnum,
	rateLimitAlertTypeEnum,
	rateLimitRecordSchema,
	checkRateLimitSchema,
	rateLimitAlertSchema,
	RATE_LIMIT_THRESHOLDS,
	RATE_LIMIT_ACTION_LABELS
} from './rate-limiting';

describe('rateLimitActionEnum', () => {
	it('accepts all valid rate limit actions', () => {
		const actions = ['allowed', 'warned', 'throttled', 'suspended'];
		for (const action of actions) {
			expect(rateLimitActionEnum.safeParse(action).success).toBe(true);
		}
	});

	it('rejects invalid action values', () => {
		expect(rateLimitActionEnum.safeParse('blocked').success).toBe(false);
		expect(rateLimitActionEnum.safeParse('').success).toBe(false);
		expect(rateLimitActionEnum.safeParse('ALLOWED').success).toBe(false);
	});
});

describe('rateLimitAlertTypeEnum', () => {
	it('accepts all valid alert types', () => {
		const types = ['mass_messaging', 'repeated_throttle', 'suspension'];
		for (const type of types) {
			expect(rateLimitAlertTypeEnum.safeParse(type).success).toBe(true);
		}
	});

	it('rejects invalid alert types', () => {
		expect(rateLimitAlertTypeEnum.safeParse('unknown').success).toBe(false);
		expect(rateLimitAlertTypeEnum.safeParse('').success).toBe(false);
	});
});

describe('rateLimitRecordSchema', () => {
	const validRecord = {
		userId: '550e8400-e29b-41d4-a716-446655440000',
		messageCount: 5,
		windowStart: '2026-01-28T10:00:00.000Z',
		windowEnd: '2026-01-28T11:00:00.000Z',
		actionTaken: 'allowed'
	};

	it('accepts a valid rate limit record', () => {
		const result = rateLimitRecordSchema.safeParse(validRecord);
		expect(result.success).toBe(true);
	});

	it('rejects invalid userId', () => {
		const result = rateLimitRecordSchema.safeParse({ ...validRecord, userId: 'not-a-uuid' });
		expect(result.success).toBe(false);
	});

	it('rejects negative messageCount', () => {
		const result = rateLimitRecordSchema.safeParse({ ...validRecord, messageCount: -1 });
		expect(result.success).toBe(false);
	});

	it('accepts zero messageCount', () => {
		const result = rateLimitRecordSchema.safeParse({ ...validRecord, messageCount: 0 });
		expect(result.success).toBe(true);
	});

	it('rejects non-integer messageCount', () => {
		const result = rateLimitRecordSchema.safeParse({ ...validRecord, messageCount: 3.5 });
		expect(result.success).toBe(false);
	});

	it('rejects invalid windowStart', () => {
		const result = rateLimitRecordSchema.safeParse({ ...validRecord, windowStart: 'bad-date' });
		expect(result.success).toBe(false);
	});

	it('rejects invalid windowEnd', () => {
		const result = rateLimitRecordSchema.safeParse({ ...validRecord, windowEnd: 'bad-date' });
		expect(result.success).toBe(false);
	});

	it('rejects invalid actionTaken', () => {
		const result = rateLimitRecordSchema.safeParse({ ...validRecord, actionTaken: 'invalid' });
		expect(result.success).toBe(false);
	});

	it('accepts all valid action types in records', () => {
		const actions = ['allowed', 'warned', 'throttled', 'suspended'];
		for (const action of actions) {
			const result = rateLimitRecordSchema.safeParse({ ...validRecord, actionTaken: action });
			expect(result.success).toBe(true);
		}
	});
});

describe('checkRateLimitSchema', () => {
	it('accepts a valid UUID', () => {
		const result = checkRateLimitSchema.safeParse({
			userId: '550e8400-e29b-41d4-a716-446655440000'
		});
		expect(result.success).toBe(true);
	});

	it('rejects invalid UUID', () => {
		const result = checkRateLimitSchema.safeParse({ userId: 'not-a-uuid' });
		expect(result.success).toBe(false);
	});

	it('rejects empty string', () => {
		const result = checkRateLimitSchema.safeParse({ userId: '' });
		expect(result.success).toBe(false);
	});

	it('rejects missing userId', () => {
		const result = checkRateLimitSchema.safeParse({});
		expect(result.success).toBe(false);
	});
});

describe('rateLimitAlertSchema', () => {
	const validAlert = {
		userId: '550e8400-e29b-41d4-a716-446655440000',
		alertType: 'mass_messaging',
		details: 'User exceeded 12 messages in 1-hour window',
		messagesInWindow: 12,
		windowStart: '2026-01-28T10:00:00.000Z',
		windowEnd: '2026-01-28T11:00:00.000Z',
		reviewed: false
	};

	it('accepts a valid alert', () => {
		const result = rateLimitAlertSchema.safeParse(validAlert);
		expect(result.success).toBe(true);
	});

	it('accepts null details', () => {
		const result = rateLimitAlertSchema.safeParse({ ...validAlert, details: null });
		expect(result.success).toBe(true);
	});

	it('rejects details exceeding 500 characters', () => {
		const result = rateLimitAlertSchema.safeParse({ ...validAlert, details: 'x'.repeat(501) });
		expect(result.success).toBe(false);
	});

	it('rejects invalid alertType', () => {
		const result = rateLimitAlertSchema.safeParse({ ...validAlert, alertType: 'invalid' });
		expect(result.success).toBe(false);
	});

	it('rejects negative messagesInWindow', () => {
		const result = rateLimitAlertSchema.safeParse({ ...validAlert, messagesInWindow: -1 });
		expect(result.success).toBe(false);
	});

	it('rejects non-integer messagesInWindow', () => {
		const result = rateLimitAlertSchema.safeParse({ ...validAlert, messagesInWindow: 5.5 });
		expect(result.success).toBe(false);
	});

	it('rejects invalid userId', () => {
		const result = rateLimitAlertSchema.safeParse({ ...validAlert, userId: 'bad-id' });
		expect(result.success).toBe(false);
	});

	it('accepts all valid alert types', () => {
		const types = ['mass_messaging', 'repeated_throttle', 'suspension'];
		for (const type of types) {
			const result = rateLimitAlertSchema.safeParse({ ...validAlert, alertType: type });
			expect(result.success).toBe(true);
		}
	});
});

describe('RATE_LIMIT_THRESHOLDS', () => {
	it('defines correct messages per hour limit', () => {
		expect(RATE_LIMIT_THRESHOLDS.MESSAGES_PER_HOUR).toBe(10);
	});

	it('defines warning threshold below messages per hour', () => {
		expect(RATE_LIMIT_THRESHOLDS.WARNING_THRESHOLD).toBeLessThan(
			RATE_LIMIT_THRESHOLDS.MESSAGES_PER_HOUR
		);
		expect(RATE_LIMIT_THRESHOLDS.WARNING_THRESHOLD).toBe(7);
	});

	it('defines throttle events threshold for suspension', () => {
		expect(RATE_LIMIT_THRESHOLDS.THROTTLE_EVENTS_FOR_SUSPENSION).toBe(3);
	});

	it('defines suspension lookback window in hours', () => {
		expect(RATE_LIMIT_THRESHOLDS.SUSPENSION_LOOKBACK_HOURS).toBe(24);
	});

	it('all threshold values are positive numbers', () => {
		expect(RATE_LIMIT_THRESHOLDS.MESSAGES_PER_HOUR).toBeGreaterThan(0);
		expect(RATE_LIMIT_THRESHOLDS.WARNING_THRESHOLD).toBeGreaterThan(0);
		expect(RATE_LIMIT_THRESHOLDS.THROTTLE_EVENTS_FOR_SUSPENSION).toBeGreaterThan(0);
		expect(RATE_LIMIT_THRESHOLDS.SUSPENSION_LOOKBACK_HOURS).toBeGreaterThan(0);
	});
});

describe('RATE_LIMIT_ACTION_LABELS', () => {
	it('has labels for all valid actions', () => {
		const actions = ['allowed', 'warned', 'throttled', 'suspended'];
		for (const action of actions) {
			expect(
				RATE_LIMIT_ACTION_LABELS[action as keyof typeof RATE_LIMIT_ACTION_LABELS]
			).toBeDefined();
		}
	});

	it('each label has title and description', () => {
		const actions = ['allowed', 'warned', 'throttled', 'suspended'];
		for (const action of actions) {
			const label = RATE_LIMIT_ACTION_LABELS[action as keyof typeof RATE_LIMIT_ACTION_LABELS];
			expect(label.title).toBeTruthy();
			expect(label.description).toBeTruthy();
		}
	});

	it('titles are non-empty strings', () => {
		for (const label of Object.values(RATE_LIMIT_ACTION_LABELS)) {
			expect(typeof label.title).toBe('string');
			expect(label.title.length).toBeGreaterThan(0);
		}
	});

	it('descriptions are non-empty strings', () => {
		for (const label of Object.values(RATE_LIMIT_ACTION_LABELS)) {
			expect(typeof label.description).toBe('string');
			expect(label.description.length).toBeGreaterThan(0);
		}
	});
});
