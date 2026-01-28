/**
 * Zod schemas for user reporting
 */
import { z } from 'zod';

/**
 * Enum for report categories matching the database enum
 */
export const reportCategoryEnum = z.enum(['harassment', 'spam', 'inappropriate', 'safety']);

export type ReportCategory = z.infer<typeof reportCategoryEnum>;

/**
 * Schema for submitting a user report
 */
export const reportUserSchema = z.object({
	reportedUserId: z.string().uuid('Invalid user ID'),
	category: reportCategoryEnum,
	context: z
		.string()
		.max(1000, 'Context must be 1000 characters or less')
		.optional()
		.transform((val) => (val === '' ? undefined : val)),
	additionalDetails: z
		.string()
		.max(500, 'Additional details must be 500 characters or less')
		.optional()
		.transform((val) => (val === '' ? undefined : val))
});

/**
 * Labels and descriptions for each report category
 */
export const REPORT_CATEGORY_LABELS: Record<
	ReportCategory,
	{ title: string; description: string }
> = {
	harassment: {
		title: 'Harassment',
		description: 'Threatening, bullying, or repeatedly unwanted contact'
	},
	spam: {
		title: 'Spam',
		description: 'Unsolicited messages, scams, or promotional content'
	},
	inappropriate: {
		title: 'Inappropriate Content',
		description: 'Offensive, discriminatory, or violating community guidelines'
	},
	safety: {
		title: 'Safety Concern',
		description: 'Potentially dangerous behavior or safety threat'
	}
};

/**
 * Type representing a submitted report entry
 */
export interface UserReport {
	id: string;
	reportedUserId: string;
	category: ReportCategory;
	context: string | null;
	additionalDetails: string | null;
	status: 'pending' | 'reviewed' | 'resolved';
	reportedAt: string;
}
