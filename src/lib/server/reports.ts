/**
 * Server functions for user reporting
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ReportCategory, UserReport } from '$lib/schemas/reports';

/**
 * Submit a report against a user.
 * @param supabase - Supabase client (authenticated as the reporter)
 * @param reportedUserId - UUID of the user being reported
 * @param category - Report category (harassment, spam, inappropriate, safety)
 * @param context - Optional context automatically captured (e.g., message content)
 * @param additionalDetails - Optional extra details from the reporter
 * @returns The created report record
 * @throws Error if reporting self, already reported recently, or database error
 */
export async function submitReport(
	supabase: SupabaseClient,
	reportedUserId: string,
	category: ReportCategory,
	context?: string,
	additionalDetails?: string
): Promise<{
	id: string;
	reporter_id: string;
	reported_user_id: string;
	category: string;
	status: string;
	reported_at: string;
}> {
	const session = await supabase.auth.getSession();
	const reporterId = session.data.session?.user.id;

	if (!reporterId) {
		throw new Error('User must be authenticated to submit a report');
	}

	if (reporterId === reportedUserId) {
		throw new Error('Cannot report yourself');
	}

	const { data, error } = await supabase
		.from('user_reports')
		.insert({
			reporter_id: reporterId,
			reported_user_id: reportedUserId,
			category,
			context: context ?? null,
			additional_details: additionalDetails ?? null
		})
		.select('id, reporter_id, reported_user_id, category, status, reported_at')
		.single();

	if (error) {
		throw new Error(`Failed to submit report: ${error.message}`);
	}

	return data;
}

/**
 * Get all reports submitted by the current user.
 * @param supabase - Supabase client (authenticated)
 * @returns Array of user report entries
 */
export async function getUserReports(supabase: SupabaseClient): Promise<UserReport[]> {
	const session = await supabase.auth.getSession();
	const userId = session.data.session?.user.id;

	if (!userId) {
		throw new Error('User must be authenticated');
	}

	const { data, error } = await supabase
		.from('user_reports')
		.select(
			`
			id,
			reported_user_id,
			category,
			context,
			additional_details,
			status,
			reported_at
		`
		)
		.eq('reporter_id', userId)
		.order('reported_at', { ascending: false });

	if (error) {
		throw new Error(`Failed to fetch reports: ${error.message}`);
	}

	return data.map((row) => ({
		id: row.id,
		reportedUserId: row.reported_user_id,
		category: row.category as ReportCategory,
		context: row.context,
		additionalDetails: row.additional_details,
		status: row.status as UserReport['status'],
		reportedAt: row.reported_at
	}));
}

/**
 * Check if the current user has an active (pending/reviewed) report against a specific user.
 * @param supabase - Supabase client (authenticated)
 * @param targetUserId - UUID of the user to check for existing reports
 * @returns true if there is an active report
 */
export async function hasActiveReport(
	supabase: SupabaseClient,
	targetUserId: string
): Promise<boolean> {
	const session = await supabase.auth.getSession();
	const userId = session.data.session?.user.id;

	if (!userId) {
		return false;
	}

	const { count, error } = await supabase
		.from('user_reports')
		.select('id', { count: 'exact', head: true })
		.eq('reporter_id', userId)
		.eq('reported_user_id', targetUserId)
		.in('status', ['pending', 'reviewed']);

	if (error) {
		return false;
	}

	return (count ?? 0) > 0;
}
