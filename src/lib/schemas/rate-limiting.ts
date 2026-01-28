/**
 * Zod schemas for rate limiting
 */
import { z } from 'zod';

/**
 * Enum of valid rate limit actions
 */
export const rateLimitActionEnum = z.enum(['allowed', 'warned', 'throttled', 'suspended']);

export type RateLimitAction = z.infer<typeof rateLimitActionEnum>;

/**
 * Enum of valid alert types
 */
export const rateLimitAlertTypeEnum = z.enum(['mass_messaging', 'repeated_throttle', 'suspension']);

export type RateLimitAlertType = z.infer<typeof rateLimitAlertTypeEnum>;

/**
 * Schema for a rate limit record entry
 */
export const rateLimitRecordSchema = z.object({
	userId: z.string().uuid('Invalid user ID'),
	messageCount: z.number().int().min(0, 'Message count must be non-negative'),
	windowStart: z.string().datetime('Invalid window start timestamp'),
	windowEnd: z.string().datetime('Invalid window end timestamp'),
	actionTaken: rateLimitActionEnum
});

/**
 * Schema for validating a user ID when checking rate limits
 */
export const checkRateLimitSchema = z.object({
	userId: z.string().uuid('Invalid user ID')
});

/**
 * Schema for a rate limit alert entry
 */
export const rateLimitAlertSchema = z.object({
	userId: z.string().uuid('Invalid user ID'),
	alertType: rateLimitAlertTypeEnum,
	details: z.string().max(500, 'Details must be 500 characters or less').nullable(),
	messagesInWindow: z.number().int().min(0, 'Messages in window must be non-negative'),
	windowStart: z.string().datetime('Invalid window start timestamp'),
	windowEnd: z.string().datetime('Invalid window end timestamp'),
	reviewed: z.boolean()
});

/**
 * Rate limit thresholds used in the system
 */
export const RATE_LIMIT_THRESHOLDS = {
	MESSAGES_PER_HOUR: 10,
	WARNING_THRESHOLD: 7,
	THROTTLE_EVENTS_FOR_SUSPENSION: 3,
	SUSPENSION_LOOKBACK_HOURS: 24
} as const;

/**
 * Labels and descriptions for each rate limit action
 */
export const RATE_LIMIT_ACTION_LABELS: Record<
	RateLimitAction,
	{ title: string; description: string }
> = {
	allowed: {
		title: 'Allowed',
		description: 'Message sent successfully within rate limits'
	},
	warned: {
		title: 'Warning',
		description: 'Approaching rate limit - sending speed should be reduced'
	},
	throttled: {
		title: 'Throttled',
		description: 'Rate limit exceeded - message was blocked'
	},
	suspended: {
		title: 'Suspended',
		description: 'Account temporarily suspended due to repeated messaging violations'
	}
};

/**
 * Type representing a rate limit record
 */
export interface RateLimitRecord {
	id: string;
	userId: string;
	messageCount: number;
	windowStart: string;
	windowEnd: string;
	actionTaken: RateLimitAction;
	createdAt: string;
}

/**
 * Type representing a rate limit alert for admin review
 */
export interface RateLimitAlert {
	id: string;
	userId: string;
	alertType: RateLimitAlertType;
	details: string | null;
	messagesInWindow: number;
	windowStart: string;
	windowEnd: string;
	reviewed: boolean;
	createdAt: string;
}
