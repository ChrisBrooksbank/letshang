/**
 * Waitlist Schema Tests
 *
 * Tests for the waitlist system migration and schema changes.
 * Validates the migration file structure and expected behavior.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('Waitlist Schema Migration', () => {
	const migrationPath = resolve(process.cwd(), 'supabase/migrations/20260125_waitlist_system.sql');
	let migrationContent: string;

	try {
		migrationContent = readFileSync(migrationPath, 'utf-8');
	} catch {
		migrationContent = '';
	}

	it('should have migration file present', () => {
		expect(migrationContent).toBeTruthy();
		expect(migrationContent.length).toBeGreaterThan(0);
	});

	describe('Enum Extension', () => {
		it('should add waitlisted status to rsvp_status enum', () => {
			expect(migrationContent).toContain('ALTER TYPE rsvp_status ADD VALUE');
			expect(migrationContent).toContain("'waitlisted'");
		});

		it('should preserve existing enum values', () => {
			// The migration shouldn't remove existing values (going, interested, not_going)
			// Just verify the ALTER TYPE syntax is correct
			const alterTypeMatch = migrationContent.match(
				/ALTER TYPE rsvp_status ADD VALUE\s+'waitlisted'/
			);
			expect(alterTypeMatch).toBeTruthy();
		});
	});

	describe('Table Schema', () => {
		it('should add waitlist_position column', () => {
			expect(migrationContent).toContain('ALTER TABLE public.event_rsvps');
			expect(migrationContent).toContain('ADD COLUMN waitlist_position INTEGER');
		});

		it('should make waitlist_position nullable', () => {
			// Verify column is nullable (no NOT NULL constraint)
			const columnMatch = migrationContent.match(/ADD COLUMN waitlist_position INTEGER/);
			expect(columnMatch).toBeTruthy();
			if (columnMatch) {
				const fullLine = migrationContent
					.split('\n')
					.find((line) => line.includes('waitlist_position'));
				expect(fullLine).toBeTruthy();
				if (fullLine) {
					expect(fullLine).not.toContain('NOT NULL');
				}
			}
		});
	});

	describe('Indexes', () => {
		it('should create index for waitlist queries', () => {
			expect(migrationContent).toContain('CREATE INDEX idx_event_rsvps_waitlist');
			expect(migrationContent).toContain(
				'ON public.event_rsvps(event_id, status, waitlist_position)'
			);
		});

		it('should create partial index for waitlisted status only', () => {
			expect(migrationContent).toContain("WHERE status = 'waitlisted'");
		});
	});

	describe('Comments', () => {
		it('should document waitlist_position column', () => {
			expect(migrationContent).toContain('COMMENT ON COLUMN public.event_rsvps.waitlist_position');
			expect(migrationContent).toContain('FIFO');
			expect(migrationContent).toContain('position');
		});
	});

	describe('Data Integrity', () => {
		it('should use INTEGER for position', () => {
			expect(migrationContent).toContain('waitlist_position INTEGER');
		});

		it('should not add default value to waitlist_position', () => {
			const columnLine = migrationContent
				.split('\n')
				.find((line) => line.includes('waitlist_position'));
			expect(columnLine).toBeTruthy();
			if (columnLine) {
				expect(columnLine).not.toContain('DEFAULT');
			}
		});
	});
});
