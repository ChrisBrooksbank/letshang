/**
 * RSVP Schema Tests
 *
 * Tests for the event_rsvps table schema, constraints, and RLS policies.
 * These tests validate the migration file structure and expected behavior.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('RSVP Schema Migration', () => {
	const migrationPath = resolve(process.cwd(), 'supabase/migrations/20260122_rsvp_schema.sql');
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

	describe('Enums', () => {
		it('should create rsvp_status enum', () => {
			expect(migrationContent).toContain('CREATE TYPE rsvp_status');
			expect(migrationContent).toContain("'going'");
			expect(migrationContent).toContain("'interested'");
			expect(migrationContent).toContain("'not_going'");
		});

		it('should have all three RSVP status values', () => {
			const enumMatch = migrationContent.match(/CREATE TYPE rsvp_status AS ENUM \(([^)]+)\)/);
			expect(enumMatch).toBeTruthy();
			if (enumMatch) {
				const enumValues = enumMatch[1];
				expect(enumValues).toContain("'going'");
				expect(enumValues).toContain("'interested'");
				expect(enumValues).toContain("'not_going'");
			}
		});
	});

	describe('Table Structure', () => {
		it('should create event_rsvps table with required fields', () => {
			expect(migrationContent).toContain('CREATE TABLE IF NOT EXISTS public.event_rsvps');
			expect(migrationContent).toContain('id UUID PRIMARY KEY');
			expect(migrationContent).toContain('event_id UUID NOT NULL');
			expect(migrationContent).toContain('user_id UUID NOT NULL');
			expect(migrationContent).toContain('status rsvp_status NOT NULL');
		});

		it('should use UUID with default generation for primary key', () => {
			expect(migrationContent).toContain('id UUID PRIMARY KEY DEFAULT uuid_generate_v4()');
		});

		it('should reference events table with CASCADE delete', () => {
			expect(migrationContent).toContain(
				'event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE'
			);
		});

		it('should reference users table with CASCADE delete', () => {
			expect(migrationContent).toContain(
				'user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE'
			);
		});

		it('should have metadata fields', () => {
			expect(migrationContent).toContain('created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()');
			expect(migrationContent).toContain('updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()');
		});
	});

	describe('Constraints', () => {
		it('should enforce unique RSVP per user per event', () => {
			expect(migrationContent).toContain('CONSTRAINT unique_rsvp_per_user_per_event');
			expect(migrationContent).toContain('UNIQUE (event_id, user_id)');
		});

		it('should require status field to be not null', () => {
			expect(migrationContent).toContain('status rsvp_status NOT NULL');
		});
	});

	describe('Indexes', () => {
		it('should create index on event_id', () => {
			expect(migrationContent).toContain('CREATE INDEX idx_event_rsvps_event_id');
			expect(migrationContent).toContain('ON public.event_rsvps(event_id)');
		});

		it('should create index on user_id', () => {
			expect(migrationContent).toContain('CREATE INDEX idx_event_rsvps_user_id');
			expect(migrationContent).toContain('ON public.event_rsvps(user_id)');
		});

		it('should create index on status', () => {
			expect(migrationContent).toContain('CREATE INDEX idx_event_rsvps_status');
			expect(migrationContent).toContain('ON public.event_rsvps(status)');
		});

		it('should create index on created_at', () => {
			expect(migrationContent).toContain('CREATE INDEX idx_event_rsvps_created_at');
			expect(migrationContent).toContain('ON public.event_rsvps(created_at)');
		});

		it('should create composite index for event attendee counts', () => {
			expect(migrationContent).toContain('CREATE INDEX idx_event_rsvps_event_status');
			expect(migrationContent).toContain('ON public.event_rsvps(event_id, status)');
		});
	});

	describe('Row Level Security', () => {
		it('should enable Row Level Security', () => {
			expect(migrationContent).toContain(
				'ALTER TABLE public.event_rsvps ENABLE ROW LEVEL SECURITY'
			);
		});

		it('should create RLS policy for users to read own RSVPs', () => {
			expect(migrationContent).toContain('CREATE POLICY "Users can read own RSVPs"');
			expect(migrationContent).toContain('FOR SELECT');
			expect(migrationContent).toContain('USING (auth.uid() = user_id)');
		});

		it('should create RLS policy for RSVPed users to see other attendees', () => {
			expect(migrationContent).toContain('CREATE POLICY "RSVPed users can see other attendees"');
			expect(migrationContent).toContain('FOR SELECT');
			expect(migrationContent).toContain('EXISTS');
			expect(migrationContent).toContain('FROM public.event_rsvps');
			expect(migrationContent).toContain('WHERE event_id = event_rsvps.event_id');
			expect(migrationContent).toContain('AND user_id = auth.uid()');
		});

		it('should create RLS policy for event creators to see all RSVPs', () => {
			expect(migrationContent).toContain('CREATE POLICY "Event creators can see all RSVPs"');
			expect(migrationContent).toContain('FOR SELECT');
			expect(migrationContent).toContain('EXISTS');
			expect(migrationContent).toContain('FROM public.events');
			expect(migrationContent).toContain('WHERE id = event_rsvps.event_id');
			expect(migrationContent).toContain('AND creator_id = auth.uid()');
		});

		it('should create RLS policy for authenticated users to create RSVPs', () => {
			expect(migrationContent).toContain('CREATE POLICY "Authenticated users can create RSVPs"');
			expect(migrationContent).toContain('FOR INSERT');
			expect(migrationContent).toContain('WITH CHECK');
			expect(migrationContent).toContain("auth.role() = 'authenticated'");
			expect(migrationContent).toContain('AND auth.uid() = user_id');
		});

		it('should create RLS policy for users to update own RSVPs', () => {
			expect(migrationContent).toContain('CREATE POLICY "Users can update own RSVPs"');
			expect(migrationContent).toContain('FOR UPDATE');
			expect(migrationContent).toContain('USING (auth.uid() = user_id)');
			expect(migrationContent).toContain('WITH CHECK (auth.uid() = user_id)');
		});

		it('should create RLS policy for users to delete own RSVPs', () => {
			expect(migrationContent).toContain('CREATE POLICY "Users can delete own RSVPs"');
			expect(migrationContent).toContain('FOR DELETE');
			expect(migrationContent).toContain('USING (auth.uid() = user_id)');
		});

		it('should have all 6 required RLS policies', () => {
			const policyCount = (migrationContent.match(/CREATE POLICY/g) || []).length;
			expect(policyCount).toBe(6);
		});
	});

	describe('Triggers', () => {
		it('should create trigger to update updated_at timestamp', () => {
			expect(migrationContent).toContain('CREATE TRIGGER update_event_rsvps_updated_at');
			expect(migrationContent).toContain('BEFORE UPDATE ON public.event_rsvps');
			expect(migrationContent).toContain('FOR EACH ROW');
			expect(migrationContent).toContain('EXECUTE FUNCTION update_updated_at_column()');
		});
	});

	describe('Comments', () => {
		it('should have table comment', () => {
			expect(migrationContent).toContain('COMMENT ON TABLE public.event_rsvps IS');
		});

		it('should have comment for id column', () => {
			expect(migrationContent).toContain('COMMENT ON COLUMN public.event_rsvps.id IS');
		});

		it('should have comment for event_id column', () => {
			expect(migrationContent).toContain('COMMENT ON COLUMN public.event_rsvps.event_id IS');
		});

		it('should have comment for user_id column', () => {
			expect(migrationContent).toContain('COMMENT ON COLUMN public.event_rsvps.user_id IS');
		});

		it('should have comment for status column', () => {
			expect(migrationContent).toContain('COMMENT ON COLUMN public.event_rsvps.status IS');
		});

		it('should have comment for created_at column', () => {
			expect(migrationContent).toContain('COMMENT ON COLUMN public.event_rsvps.created_at IS');
		});

		it('should have comment for updated_at column', () => {
			expect(migrationContent).toContain('COMMENT ON COLUMN public.event_rsvps.updated_at IS');
		});

		it('should describe RSVP status types in status comment', () => {
			const statusCommentMatch = migrationContent.match(
				/COMMENT ON COLUMN public\.event_rsvps\.status IS '([^']+)'/
			);
			expect(statusCommentMatch).toBeTruthy();
			if (statusCommentMatch) {
				const comment = statusCommentMatch[1];
				expect(comment).toContain('going');
				expect(comment).toContain('interested');
				expect(comment).toContain('not_going');
			}
		});
	});

	describe('Acceptance Criteria Validation', () => {
		it('AC: event_rsvps table exists', () => {
			expect(migrationContent).toContain('CREATE TABLE IF NOT EXISTS public.event_rsvps');
		});

		it('AC: has rsvp_id field (id UUID)', () => {
			expect(migrationContent).toContain('id UUID PRIMARY KEY');
		});

		it('AC: has event_id field', () => {
			expect(migrationContent).toContain('event_id UUID NOT NULL');
		});

		it('AC: has user_id field', () => {
			expect(migrationContent).toContain('user_id UUID NOT NULL');
		});

		it('AC: status enum has going, interested, not_going', () => {
			expect(migrationContent).toContain("'going'");
			expect(migrationContent).toContain("'interested'");
			expect(migrationContent).toContain("'not_going'");
		});

		it('AC: has created_at timestamp', () => {
			expect(migrationContent).toContain('created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()');
		});

		it('AC: has updated_at timestamp', () => {
			expect(migrationContent).toContain('updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()');
		});

		it('AC: RLS policies for RSVP visibility exist', () => {
			// Users can see own RSVPs
			expect(migrationContent).toContain('CREATE POLICY "Users can read own RSVPs"');
			// RSVPed users can see other attendees
			expect(migrationContent).toContain('CREATE POLICY "RSVPed users can see other attendees"');
			// Event creators can see all RSVPs
			expect(migrationContent).toContain('CREATE POLICY "Event creators can see all RSVPs"');
		});
	});
});

describe('Hybrid Event Attendance Mode Migration', () => {
	const migrationPath = resolve(
		process.cwd(),
		'supabase/migrations/20260125_hybrid_attendance_mode.sql'
	);
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

	describe('Attendance Mode Enum', () => {
		it('should create attendance_mode enum', () => {
			expect(migrationContent).toContain('CREATE TYPE attendance_mode');
			expect(migrationContent).toContain("'in_person'");
			expect(migrationContent).toContain("'online'");
		});

		it('should have both attendance mode values', () => {
			const enumMatch = migrationContent.match(/CREATE TYPE attendance_mode AS ENUM \(([^)]+)\)/);
			expect(enumMatch).toBeTruthy();
			if (enumMatch) {
				const enumValues = enumMatch[1];
				expect(enumValues).toContain("'in_person'");
				expect(enumValues).toContain("'online'");
			}
		});
	});

	describe('Table Alteration', () => {
		it('should add attendance_mode column to event_rsvps', () => {
			expect(migrationContent).toContain('ALTER TABLE public.event_rsvps');
			expect(migrationContent).toContain('ADD COLUMN attendance_mode attendance_mode');
		});

		it('should have comment for attendance_mode column', () => {
			expect(migrationContent).toContain('COMMENT ON COLUMN public.event_rsvps.attendance_mode');
		});

		it('should describe hybrid events in attendance_mode comment', () => {
			const commentMatch = migrationContent.match(
				/COMMENT ON COLUMN public\.event_rsvps\.attendance_mode IS '([^']+)'/
			);
			expect(commentMatch).toBeTruthy();
			if (commentMatch) {
				const comment = commentMatch[1];
				expect(comment.toLowerCase()).toContain('hybrid');
			}
		});
	});

	describe('Indexes', () => {
		it('should create index on attendance_mode', () => {
			expect(migrationContent).toContain('CREATE INDEX idx_event_rsvps_attendance_mode');
			expect(migrationContent).toContain('ON public.event_rsvps(attendance_mode)');
		});
	});

	describe('Acceptance Criteria Validation', () => {
		it('AC: attendance_mode field added', () => {
			expect(migrationContent).toContain('ADD COLUMN attendance_mode');
		});

		it('AC: attendance_mode enum has in_person and online', () => {
			expect(migrationContent).toContain("'in_person'");
			expect(migrationContent).toContain("'online'");
		});

		it('AC: attendance_mode is nullable (for non-hybrid events)', () => {
			// The column should NOT have a NOT NULL constraint
			const addColumnLine = migrationContent
				.split('\n')
				.find((line) => line.includes('ADD COLUMN attendance_mode'));
			expect(addColumnLine).toBeTruthy();
			if (addColumnLine) {
				expect(addColumnLine).not.toContain('NOT NULL');
			}
		});
	});
});
