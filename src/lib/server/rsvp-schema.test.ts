/**
 * RSVP Schema Tests
 *
 * Tests for the event_rsvps table schema, constraints, and RLS policies.
 * These tests validate the consolidated schema file structure and expected behavior.
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

describe('RSVP Schema', () => {
	it('should have schema file present', () => {
		expect(schemaContent).toBeTruthy();
		expect(schemaContent.length).toBeGreaterThan(0);
	});

	describe('Enums', () => {
		it('should create rsvp_status enum', () => {
			expect(schemaContent).toContain('CREATE TYPE rsvp_status');
			expect(schemaContent).toContain("'going'");
			expect(schemaContent).toContain("'interested'");
			expect(schemaContent).toContain("'not_going'");
		});

		it('should have all RSVP status values including waitlisted', () => {
			expect(schemaContent).toMatch(
				/CREATE TYPE rsvp_status AS ENUM\s*\([^)]*'going'[^)]*'interested'[^)]*'not_going'[^)]*'waitlisted'[^)]*\)/
			);
		});
	});

	describe('Table Structure', () => {
		it('should create event_rsvps table with required fields', () => {
			expect(schemaContent).toContain('CREATE TABLE IF NOT EXISTS public.event_rsvps');
			expect(schemaContent).toContain('id UUID PRIMARY KEY');
			expect(schemaContent).toContain('event_id UUID NOT NULL');
			expect(schemaContent).toContain('user_id UUID NOT NULL');
			expect(schemaContent).toContain('status rsvp_status NOT NULL');
		});

		it('should use gen_random_uuid() for primary key default', () => {
			expect(schemaContent).toContain('id UUID PRIMARY KEY DEFAULT gen_random_uuid()');
		});

		it('should reference events table with CASCADE delete', () => {
			expect(schemaContent).toContain(
				'event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE'
			);
		});

		it('should reference users table with CASCADE delete', () => {
			expect(schemaContent).toContain(
				'user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE'
			);
		});

		it('should have metadata fields', () => {
			expect(schemaContent).toContain('created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()');
			expect(schemaContent).toContain('updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()');
		});

		it('should have attendance_mode column for hybrid events', () => {
			expect(schemaContent).toContain('attendance_mode attendance_mode');
		});

		it('should have waitlist_position column', () => {
			expect(schemaContent).toContain('waitlist_position INTEGER');
		});
	});

	describe('Constraints', () => {
		it('should enforce unique RSVP per user per event', () => {
			expect(schemaContent).toContain('CONSTRAINT unique_rsvp_per_user_per_event');
			expect(schemaContent).toContain('UNIQUE (event_id, user_id)');
		});

		it('should require status field to be not null', () => {
			expect(schemaContent).toContain('status rsvp_status NOT NULL');
		});
	});

	describe('Indexes', () => {
		it('should create index on event_id', () => {
			expect(schemaContent).toContain('idx_event_rsvps_event_id');
			expect(schemaContent).toContain('ON public.event_rsvps(event_id)');
		});

		it('should create index on user_id', () => {
			expect(schemaContent).toContain('idx_event_rsvps_user_id');
			expect(schemaContent).toContain('ON public.event_rsvps(user_id)');
		});

		it('should create index on status', () => {
			expect(schemaContent).toContain('idx_event_rsvps_status');
			expect(schemaContent).toContain('ON public.event_rsvps(status)');
		});

		it('should create index on created_at', () => {
			expect(schemaContent).toContain('idx_event_rsvps_created_at');
			expect(schemaContent).toContain('ON public.event_rsvps(created_at)');
		});

		it('should create composite index for event attendee counts', () => {
			expect(schemaContent).toContain('idx_event_rsvps_event_status');
			expect(schemaContent).toContain('ON public.event_rsvps(event_id, status)');
		});

		it('should create index on attendance_mode', () => {
			expect(schemaContent).toContain('idx_event_rsvps_attendance_mode');
			expect(schemaContent).toContain('ON public.event_rsvps(attendance_mode)');
		});
	});

	describe('Row Level Security', () => {
		it('should enable Row Level Security', () => {
			expect(schemaContent).toContain('ALTER TABLE public.event_rsvps ENABLE ROW LEVEL SECURITY');
		});

		it('should create RLS policy for users to read own RSVPs', () => {
			expect(schemaContent).toContain('CREATE POLICY "Users can read own RSVPs"');
			expect(schemaContent).toContain('FOR SELECT');
			expect(schemaContent).toContain('USING (auth.uid() = user_id)');
		});

		it('should create RLS policy for RSVPed users to see other attendees', () => {
			expect(schemaContent).toContain('CREATE POLICY "RSVPed users can see other attendees"');
			expect(schemaContent).toContain('FOR SELECT');
			expect(schemaContent).toContain('EXISTS');
			expect(schemaContent).toContain('FROM public.event_rsvps er');
			expect(schemaContent).toContain('WHERE er.event_id = event_rsvps.event_id');
			expect(schemaContent).toContain('AND er.user_id = auth.uid()');
		});

		it('should create RLS policy for event creators to see all RSVPs', () => {
			expect(schemaContent).toContain('CREATE POLICY "Event creators can see all RSVPs"');
			expect(schemaContent).toContain('FOR SELECT');
			expect(schemaContent).toContain('EXISTS');
			expect(schemaContent).toContain('FROM public.events');
			expect(schemaContent).toContain('WHERE id = event_rsvps.event_id');
			expect(schemaContent).toContain('AND creator_id = auth.uid()');
		});

		it('should create RLS policy for authenticated users to create RSVPs', () => {
			expect(schemaContent).toContain('CREATE POLICY "Authenticated users can create RSVPs"');
			expect(schemaContent).toContain('FOR INSERT');
			expect(schemaContent).toContain('WITH CHECK');
			expect(schemaContent).toContain("auth.role() = 'authenticated'");
			expect(schemaContent).toContain('AND auth.uid() = user_id');
		});

		it('should create RLS policy for users to update own RSVPs', () => {
			expect(schemaContent).toContain('CREATE POLICY "Users can update own RSVPs"');
			expect(schemaContent).toContain('FOR UPDATE');
			expect(schemaContent).toContain('USING (auth.uid() = user_id)');
			expect(schemaContent).toContain('WITH CHECK (auth.uid() = user_id)');
		});

		it('should create RLS policy for users to delete own RSVPs', () => {
			expect(schemaContent).toContain('CREATE POLICY "Users can delete own RSVPs"');
			expect(schemaContent).toContain('FOR DELETE');
			expect(schemaContent).toContain('USING (auth.uid() = user_id)');
		});

		it('should create RLS policy for event creators to check in attendees', () => {
			expect(schemaContent).toContain('CREATE POLICY "Event creators can check in attendees"');
		});
	});

	describe('Triggers', () => {
		it('should create trigger to update updated_at timestamp', () => {
			expect(schemaContent).toContain('CREATE TRIGGER update_event_rsvps_updated_at');
			expect(schemaContent).toContain('BEFORE UPDATE ON public.event_rsvps');
			expect(schemaContent).toContain('FOR EACH ROW');
			expect(schemaContent).toContain('EXECUTE FUNCTION update_updated_at_column()');
		});
	});

	describe('Comments', () => {
		it('should have table comment', () => {
			expect(schemaContent).toContain('COMMENT ON TABLE public.event_rsvps IS');
		});

		it('should have comment for id column', () => {
			expect(schemaContent).toContain('COMMENT ON COLUMN public.event_rsvps.id IS');
		});

		it('should have comment for event_id column', () => {
			expect(schemaContent).toContain('COMMENT ON COLUMN public.event_rsvps.event_id IS');
		});

		it('should have comment for user_id column', () => {
			expect(schemaContent).toContain('COMMENT ON COLUMN public.event_rsvps.user_id IS');
		});

		it('should have comment for status column', () => {
			expect(schemaContent).toContain('COMMENT ON COLUMN public.event_rsvps.status IS');
		});

		it('should have comment for bail_out_reason column', () => {
			expect(schemaContent).toContain('COMMENT ON COLUMN public.event_rsvps.bail_out_reason IS');
		});

		it('should describe RSVP status types in status comment', () => {
			const statusCommentMatch = schemaContent.match(
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

		it('should have comment for attendance_mode column', () => {
			expect(schemaContent).toContain('COMMENT ON COLUMN public.event_rsvps.attendance_mode');
		});

		it('should describe hybrid events in attendance_mode comment', () => {
			const commentMatch = schemaContent.match(
				/COMMENT ON COLUMN public\.event_rsvps\.attendance_mode IS '([^']+)'/
			);
			expect(commentMatch).toBeTruthy();
			if (commentMatch) {
				const comment = commentMatch[1];
				expect(comment.toLowerCase()).toContain('hybrid');
			}
		});
	});

	describe('Acceptance Criteria Validation', () => {
		it('AC: event_rsvps table exists', () => {
			expect(schemaContent).toContain('CREATE TABLE IF NOT EXISTS public.event_rsvps');
		});

		it('AC: has rsvp_id field (id UUID)', () => {
			expect(schemaContent).toContain('id UUID PRIMARY KEY');
		});

		it('AC: has event_id field', () => {
			expect(schemaContent).toContain('event_id UUID NOT NULL');
		});

		it('AC: has user_id field', () => {
			expect(schemaContent).toContain('user_id UUID NOT NULL');
		});

		it('AC: status enum has going, interested, not_going', () => {
			expect(schemaContent).toContain("'going'");
			expect(schemaContent).toContain("'interested'");
			expect(schemaContent).toContain("'not_going'");
		});

		it('AC: has created_at timestamp', () => {
			expect(schemaContent).toContain('created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()');
		});

		it('AC: has updated_at timestamp', () => {
			expect(schemaContent).toContain('updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()');
		});

		it('AC: RLS policies for RSVP visibility exist', () => {
			expect(schemaContent).toContain('CREATE POLICY "Users can read own RSVPs"');
			expect(schemaContent).toContain('CREATE POLICY "RSVPed users can see other attendees"');
			expect(schemaContent).toContain('CREATE POLICY "Event creators can see all RSVPs"');
		});

		it('AC: attendance_mode enum has in_person and online', () => {
			expect(schemaContent).toContain('CREATE TYPE attendance_mode');
			expect(schemaContent).toContain("'in_person'");
			expect(schemaContent).toContain("'online'");
		});

		it('AC: attendance_mode is nullable (for non-hybrid events)', () => {
			// In the CREATE TABLE, attendance_mode has no NOT NULL constraint
			expect(schemaContent).toContain('attendance_mode attendance_mode');
			expect(schemaContent).not.toContain('attendance_mode attendance_mode NOT NULL');
		});
	});
});
