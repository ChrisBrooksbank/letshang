import { describe, it, expect } from 'vitest';
import { reportUserSchema, reportCategoryEnum, REPORT_CATEGORY_LABELS } from './reports';

describe('reportCategoryEnum', () => {
	it('accepts valid category: harassment', () => {
		const result = reportCategoryEnum.safeParse('harassment');
		expect(result.success).toBe(true);
	});

	it('accepts valid category: spam', () => {
		const result = reportCategoryEnum.safeParse('spam');
		expect(result.success).toBe(true);
	});

	it('accepts valid category: inappropriate', () => {
		const result = reportCategoryEnum.safeParse('inappropriate');
		expect(result.success).toBe(true);
	});

	it('accepts valid category: safety', () => {
		const result = reportCategoryEnum.safeParse('safety');
		expect(result.success).toBe(true);
	});

	it('rejects invalid category', () => {
		const result = reportCategoryEnum.safeParse('invalid_category');
		expect(result.success).toBe(false);
	});

	it('rejects empty string category', () => {
		const result = reportCategoryEnum.safeParse('');
		expect(result.success).toBe(false);
	});
});

describe('reportUserSchema', () => {
	it('validates a valid report with all fields', () => {
		const result = reportUserSchema.safeParse({
			reportedUserId: '550e8400-e29b-41d4-a716-446655440000',
			category: 'harassment',
			context: 'They sent threatening messages',
			additionalDetails: 'This has happened multiple times'
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.reportedUserId).toBe('550e8400-e29b-41d4-a716-446655440000');
			expect(result.data.category).toBe('harassment');
			expect(result.data.context).toBe('They sent threatening messages');
			expect(result.data.additionalDetails).toBe('This has happened multiple times');
		}
	});

	it('validates a report with only required fields', () => {
		const result = reportUserSchema.safeParse({
			reportedUserId: '550e8400-e29b-41d4-a716-446655440000',
			category: 'spam'
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.context).toBeUndefined();
			expect(result.data.additionalDetails).toBeUndefined();
		}
	});

	it('transforms empty context string to undefined', () => {
		const result = reportUserSchema.safeParse({
			reportedUserId: '550e8400-e29b-41d4-a716-446655440000',
			category: 'spam',
			context: ''
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.context).toBeUndefined();
		}
	});

	it('transforms empty additionalDetails string to undefined', () => {
		const result = reportUserSchema.safeParse({
			reportedUserId: '550e8400-e29b-41d4-a716-446655440000',
			category: 'inappropriate',
			additionalDetails: ''
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.additionalDetails).toBeUndefined();
		}
	});

	it('rejects invalid UUID for reportedUserId', () => {
		const result = reportUserSchema.safeParse({
			reportedUserId: 'not-a-uuid',
			category: 'harassment'
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.flatten().fieldErrors.reportedUserId).toBeDefined();
		}
	});

	it('rejects missing reportedUserId', () => {
		const result = reportUserSchema.safeParse({
			category: 'harassment'
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.flatten().fieldErrors.reportedUserId).toBeDefined();
		}
	});

	it('rejects missing category', () => {
		const result = reportUserSchema.safeParse({
			reportedUserId: '550e8400-e29b-41d4-a716-446655440000'
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.flatten().fieldErrors.category).toBeDefined();
		}
	});

	it('rejects invalid category value', () => {
		const result = reportUserSchema.safeParse({
			reportedUserId: '550e8400-e29b-41d4-a716-446655440000',
			category: 'invalid'
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.flatten().fieldErrors.category).toBeDefined();
		}
	});

	it('rejects context exceeding 1000 characters', () => {
		const result = reportUserSchema.safeParse({
			reportedUserId: '550e8400-e29b-41d4-a716-446655440000',
			category: 'harassment',
			context: 'x'.repeat(1001)
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.flatten().fieldErrors.context).toBeDefined();
		}
	});

	it('accepts context at exactly 1000 characters', () => {
		const result = reportUserSchema.safeParse({
			reportedUserId: '550e8400-e29b-41d4-a716-446655440000',
			category: 'safety',
			context: 'x'.repeat(1000)
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.context?.length).toBe(1000);
		}
	});

	it('rejects additionalDetails exceeding 500 characters', () => {
		const result = reportUserSchema.safeParse({
			reportedUserId: '550e8400-e29b-41d4-a716-446655440000',
			category: 'spam',
			additionalDetails: 'x'.repeat(501)
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.flatten().fieldErrors.additionalDetails).toBeDefined();
		}
	});

	it('accepts additionalDetails at exactly 500 characters', () => {
		const result = reportUserSchema.safeParse({
			reportedUserId: '550e8400-e29b-41d4-a716-446655440000',
			category: 'inappropriate',
			additionalDetails: 'x'.repeat(500)
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.additionalDetails?.length).toBe(500);
		}
	});
});

describe('REPORT_CATEGORY_LABELS', () => {
	it('has entries for all valid categories', () => {
		expect(REPORT_CATEGORY_LABELS.harassment).toBeDefined();
		expect(REPORT_CATEGORY_LABELS.spam).toBeDefined();
		expect(REPORT_CATEGORY_LABELS.inappropriate).toBeDefined();
		expect(REPORT_CATEGORY_LABELS.safety).toBeDefined();
	});

	it('each label has title and description', () => {
		for (const [, label] of Object.entries(REPORT_CATEGORY_LABELS)) {
			expect(label.title).toBeTruthy();
			expect(label.description).toBeTruthy();
		}
	});
});
