/**
 * Waitlist Schema Tests
 *
 * Tests for the waitlist system in the consolidated schema.
 * Validates that waitlist features are properly defined.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const schemaPath = resolve(process.cwd(), 'supabase/consolidated_schema.sql');
let schemaContent: string;

try {
	schemaContent = readFileSync(schemaPath, 'utf-8');
} catch {
	schemaContent = '';
}

describe('Waitlist Schema', () => {
	it('should have schema file present', () => {
		expect(schemaContent).toBeTruthy();
		expect(schemaContent.length).toBeGreaterThan(0);
	});

	describe('Enum', () => {
		it('should include waitlisted status in rsvp_status enum', () => {
			expect(schemaContent).toContain("'waitlisted'");
		});

		it('should have waitlisted in the rsvp_status CREATE TYPE definition', () => {
			expect(schemaContent).toMatch(/CREATE TYPE rsvp_status AS ENUM\s*\([^)]*'waitlisted'[^)]*\)/);
		});
	});

	describe('Table Schema', () => {
		it('should have waitlist_position column in event_rsvps', () => {
			expect(schemaContent).toContain('waitlist_position INTEGER');
		});

		it('should make waitlist_position nullable', () => {
			// Verify column is in the CREATE TABLE without NOT NULL
			const lines = schemaContent.split('\n');
			const waitlistLine = lines.find((line) => line.includes('waitlist_position'));
			expect(waitlistLine).toBeTruthy();
			if (waitlistLine) {
				expect(waitlistLine).not.toContain('NOT NULL');
			}
		});
	});

	describe('Indexes', () => {
		it('should create index for waitlist queries', () => {
			expect(schemaContent).toContain('idx_event_rsvps_waitlist');
			expect(schemaContent).toContain('ON public.event_rsvps(event_id, status, waitlist_position)');
		});

		it('should create partial index for waitlisted status only', () => {
			expect(schemaContent).toContain("WHERE status = 'waitlisted'");
		});
	});

	describe('Comments', () => {
		it('should document waitlist_position column', () => {
			expect(schemaContent).toContain('COMMENT ON COLUMN public.event_rsvps.waitlist_position');
			expect(schemaContent).toContain('FIFO');
			expect(schemaContent).toContain('position');
		});
	});

	describe('Data Integrity', () => {
		it('should use INTEGER for position', () => {
			expect(schemaContent).toContain('waitlist_position INTEGER');
		});

		it('should not add default value to waitlist_position', () => {
			const columnLine = schemaContent
				.split('\n')
				.find((line) => line.includes('waitlist_position'));
			expect(columnLine).toBeTruthy();
			if (columnLine) {
				expect(columnLine).not.toContain('DEFAULT');
			}
		});
	});
});
