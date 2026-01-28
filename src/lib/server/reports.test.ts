import { describe, it, expect, vi, beforeEach } from 'vitest';
import { submitReport, getUserReports, hasActiveReport } from './reports';

const CURRENT_USER_ID = 'current-user-0000-0000-000000000001';
const TARGET_USER_ID = 'target-user-0000-0000-000000000002';
const REPORT_RECORD_ID = 'report-id-0000-0000-0000-000000000001';

function createMockSupabase(
	sessionUserId: string | null = CURRENT_USER_ID,
	queryResult: { data: unknown; error: unknown; count?: number } = { data: null, error: null }
) {
	const selectFn = vi.fn().mockReturnValue(queryResult);
	const singleFn = vi.fn().mockReturnValue(queryResult);
	const orderFn = vi.fn().mockReturnValue(queryResult);
	const eqFn = vi.fn().mockReturnThis();
	const inFn = vi.fn().mockReturnValue(queryResult);
	const insertFn = vi.fn().mockReturnThis();
	const fromFn = vi.fn().mockReturnValue({
		insert: insertFn,
		select: selectFn
	});

	insertFn.mockReturnValue({ select: selectFn });
	selectFn.mockReturnValue({ single: singleFn, eq: eqFn, order: orderFn });
	eqFn.mockReturnValue({ eq: eqFn, in: inFn, order: orderFn });
	singleFn.mockReturnValue(queryResult);
	orderFn.mockReturnValue(queryResult);
	inFn.mockReturnValue(queryResult);

	return {
		supabase: {
			auth: {
				getSession: vi.fn().mockResolvedValue({
					data: {
						session: sessionUserId ? { user: { id: sessionUserId } } : null
					}
				})
			},
			from: fromFn
		},
		fromFn,
		insertFn,
		selectFn,
		eqFn,
		singleFn,
		orderFn,
		inFn
	};
}

describe('submitReport', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('submits a report successfully with all fields', async () => {
		const reportRecord = {
			id: REPORT_RECORD_ID,
			reporter_id: CURRENT_USER_ID,
			reported_user_id: TARGET_USER_ID,
			category: 'harassment',
			status: 'pending',
			reported_at: '2026-01-28T12:00:00Z'
		};
		const { supabase } = createMockSupabase(CURRENT_USER_ID, { data: reportRecord, error: null });

		const result = await submitReport(
			supabase as never,
			TARGET_USER_ID,
			'harassment',
			'Threatening messages sent',
			'This happened twice this week'
		);

		expect(result).toEqual(reportRecord);
	});

	it('submits a report with only required fields', async () => {
		const reportRecord = {
			id: REPORT_RECORD_ID,
			reporter_id: CURRENT_USER_ID,
			reported_user_id: TARGET_USER_ID,
			category: 'spam',
			status: 'pending',
			reported_at: '2026-01-28T12:00:00Z'
		};
		const { supabase } = createMockSupabase(CURRENT_USER_ID, { data: reportRecord, error: null });

		const result = await submitReport(supabase as never, TARGET_USER_ID, 'spam');

		expect(result).toEqual(reportRecord);
	});

	it('submits a report for safety category', async () => {
		const reportRecord = {
			id: REPORT_RECORD_ID,
			reporter_id: CURRENT_USER_ID,
			reported_user_id: TARGET_USER_ID,
			category: 'safety',
			status: 'pending',
			reported_at: '2026-01-28T12:00:00Z'
		};
		const { supabase } = createMockSupabase(CURRENT_USER_ID, { data: reportRecord, error: null });

		const result = await submitReport(
			supabase as never,
			TARGET_USER_ID,
			'safety',
			'Potential danger at event'
		);

		expect(result).toEqual(reportRecord);
	});

	it('throws when user is not authenticated', async () => {
		const { supabase } = createMockSupabase(null);

		await expect(submitReport(supabase as never, TARGET_USER_ID, 'harassment')).rejects.toThrow(
			'User must be authenticated to submit a report'
		);
	});

	it('throws when trying to report self', async () => {
		const { supabase } = createMockSupabase(CURRENT_USER_ID);

		await expect(submitReport(supabase as never, CURRENT_USER_ID, 'harassment')).rejects.toThrow(
			'Cannot report yourself'
		);
	});

	it('throws with database error message on failure', async () => {
		const { supabase } = createMockSupabase(CURRENT_USER_ID, {
			data: null,
			error: { code: '50000', message: 'connection timeout' }
		});

		await expect(submitReport(supabase as never, TARGET_USER_ID, 'spam')).rejects.toThrow(
			'Failed to submit report: connection timeout'
		);
	});
});

describe('getUserReports', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns user reports with all fields', async () => {
		const dbRows = [
			{
				id: REPORT_RECORD_ID,
				reported_user_id: TARGET_USER_ID,
				category: 'harassment',
				context: 'Sent threatening messages',
				additional_details: 'Repeated behavior',
				status: 'pending',
				reported_at: '2026-01-28T12:00:00Z'
			}
		];
		const { supabase } = createMockSupabase(CURRENT_USER_ID, { data: dbRows, error: null });

		const result = await getUserReports(supabase as never);

		expect(result).toHaveLength(1);
		expect(result[0]).toEqual({
			id: REPORT_RECORD_ID,
			reportedUserId: TARGET_USER_ID,
			category: 'harassment',
			context: 'Sent threatening messages',
			additionalDetails: 'Repeated behavior',
			status: 'pending',
			reportedAt: '2026-01-28T12:00:00Z'
		});
	});

	it('returns empty array when no reports exist', async () => {
		const { supabase } = createMockSupabase(CURRENT_USER_ID, { data: [], error: null });

		const result = await getUserReports(supabase as never);

		expect(result).toHaveLength(0);
	});

	it('handles null optional fields gracefully', async () => {
		const dbRows = [
			{
				id: REPORT_RECORD_ID,
				reported_user_id: TARGET_USER_ID,
				category: 'spam',
				context: null,
				additional_details: null,
				status: 'resolved',
				reported_at: '2026-01-28T12:00:00Z'
			}
		];
		const { supabase } = createMockSupabase(CURRENT_USER_ID, { data: dbRows, error: null });

		const result = await getUserReports(supabase as never);

		expect(result[0].context).toBeNull();
		expect(result[0].additionalDetails).toBeNull();
		expect(result[0].status).toBe('resolved');
	});

	it('throws when user is not authenticated', async () => {
		const { supabase } = createMockSupabase(null);

		await expect(getUserReports(supabase as never)).rejects.toThrow('User must be authenticated');
	});

	it('throws with database error message', async () => {
		const { supabase } = createMockSupabase(CURRENT_USER_ID, {
			data: null,
			error: { code: '50000', message: 'query failed' }
		});

		await expect(getUserReports(supabase as never)).rejects.toThrow(
			'Failed to fetch reports: query failed'
		);
	});
});

describe('hasActiveReport', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	const createHasReportMock = (
		sessionUserId: string | null,
		count: number | null,
		error: unknown = null
	) => {
		const inFn = vi.fn().mockReturnValue({ count, error });
		const eqFn = vi.fn();
		const selectFn = vi.fn().mockReturnValue({ eq: eqFn });
		const fromFn = vi.fn().mockReturnValue({ select: selectFn });
		eqFn.mockReturnValue({ eq: eqFn, in: inFn });

		return {
			supabase: {
				auth: {
					getSession: vi.fn().mockResolvedValue({
						data: {
							session: sessionUserId ? { user: { id: sessionUserId } } : null
						}
					})
				},
				from: fromFn
			}
		};
	};

	it('returns true when active report exists', async () => {
		const { supabase } = createHasReportMock(CURRENT_USER_ID, 1);

		const result = await hasActiveReport(supabase as never, TARGET_USER_ID);

		expect(result).toBe(true);
	});

	it('returns false when no active report exists', async () => {
		const { supabase } = createHasReportMock(CURRENT_USER_ID, 0);

		const result = await hasActiveReport(supabase as never, TARGET_USER_ID);

		expect(result).toBe(false);
	});

	it('returns false when user is not authenticated', async () => {
		const { supabase } = createHasReportMock(null, 0);

		const result = await hasActiveReport(supabase as never, TARGET_USER_ID);

		expect(result).toBe(false);
	});

	it('returns false on database error', async () => {
		const { supabase } = createHasReportMock(CURRENT_USER_ID, null, {
			code: '50000',
			message: 'connection failed'
		});

		const result = await hasActiveReport(supabase as never, TARGET_USER_ID);

		expect(result).toBe(false);
	});
});
