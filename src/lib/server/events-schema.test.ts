/**
 * Events Schema Tests
 *
 * Tests for the events table schema, constraints, and RLS policies.
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

describe('Events Schema', () => {
	it('should have schema file present', () => {
		expect(schemaContent).toBeTruthy();
		expect(schemaContent.length).toBeGreaterThan(0);
	});

	describe('Enums', () => {
		it('should create event_type enum', () => {
			expect(schemaContent).toContain('CREATE TYPE event_type');
			expect(schemaContent).toContain("'in_person'");
			expect(schemaContent).toContain("'online'");
			expect(schemaContent).toContain("'hybrid'");
		});

		it('should create event_visibility enum', () => {
			expect(schemaContent).toContain('CREATE TYPE event_visibility');
			expect(schemaContent).toContain("'public'");
			expect(schemaContent).toContain("'group_only'");
			expect(schemaContent).toContain("'hidden'");
		});
	});

	describe('Table Structure', () => {
		it('should create events table with required fields', () => {
			expect(schemaContent).toContain('CREATE TABLE IF NOT EXISTS public.events');
			expect(schemaContent).toContain('id UUID PRIMARY KEY');
			expect(schemaContent).toContain('creator_id UUID NOT NULL');
			expect(schemaContent).toContain('group_id UUID DEFAULT NULL');
			expect(schemaContent).toContain('title TEXT NOT NULL');
			expect(schemaContent).toContain('description TEXT NOT NULL');
			expect(schemaContent).toContain('event_type event_type NOT NULL');
			expect(schemaContent).toContain('start_time TIMESTAMPTZ NOT NULL');
			expect(schemaContent).toContain('end_time TIMESTAMPTZ');
		});

		it('should reference users table with CASCADE delete', () => {
			expect(schemaContent).toContain('REFERENCES public.users(id) ON DELETE CASCADE');
		});

		it('should have location fields for in-person events', () => {
			expect(schemaContent).toContain('venue_name TEXT');
			expect(schemaContent).toContain('venue_address TEXT');
			expect(schemaContent).toContain('venue_lat DECIMAL(10, 8)');
			expect(schemaContent).toContain('venue_lng DECIMAL(11, 8)');
		});

		it('should have video_link field for online events', () => {
			expect(schemaContent).toContain('video_link TEXT');
		});

		it('should have capacity field with constraints', () => {
			expect(schemaContent).toContain('capacity INTEGER');
		});

		it('should have metadata fields', () => {
			expect(schemaContent).toContain('created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()');
			expect(schemaContent).toContain('updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()');
		});
	});

	describe('Constraints', () => {
		it('should enforce title length constraint (5-100 chars)', () => {
			expect(schemaContent).toContain('title TEXT NOT NULL CHECK');
			expect(schemaContent).toMatch(/char_length\(title\)\s*>=\s*5/);
			expect(schemaContent).toMatch(/char_length\(title\)\s*<=\s*100/);
		});

		it('should enforce description length constraint (max 5000 chars)', () => {
			expect(schemaContent).toContain('description TEXT NOT NULL CHECK');
			expect(schemaContent).toMatch(/char_length\(description\)\s*<=\s*5000/);
		});

		it('should enforce capacity constraint (1-10000)', () => {
			expect(schemaContent).toMatch(/capacity\s+INTEGER\s+CHECK.*capacity\s*>=\s*1/);
			expect(schemaContent).toMatch(/capacity.*<=\s*10000/);
		});

		it('should enforce end_time after start_time constraint', () => {
			expect(schemaContent).toContain('CONSTRAINT end_time_after_start CHECK');
			expect(schemaContent).toContain('end_time > start_time');
		});

		it('should enforce positive duration constraint', () => {
			expect(schemaContent).toContain('CONSTRAINT duration_positive CHECK');
			expect(schemaContent).toContain('duration_minutes > 0');
		});

		it('should enforce in_person events have venue', () => {
			expect(schemaContent).toContain('CONSTRAINT in_person_has_venue CHECK');
			expect(schemaContent).toContain("event_type != 'in_person'");
			expect(schemaContent).toContain('venue_name IS NOT NULL');
			expect(schemaContent).toContain('venue_address IS NOT NULL');
		});

		it('should enforce online events have video link', () => {
			expect(schemaContent).toContain('CONSTRAINT online_has_link CHECK');
			expect(schemaContent).toContain("event_type != 'online'");
			expect(schemaContent).toContain('video_link IS NOT NULL');
		});

		it('should enforce hybrid events have both venue and link', () => {
			expect(schemaContent).toContain('CONSTRAINT hybrid_has_both CHECK');
			expect(schemaContent).toContain("event_type != 'hybrid'");
			expect(schemaContent).toContain('venue_name IS NOT NULL');
			expect(schemaContent).toContain('venue_address IS NOT NULL');
			expect(schemaContent).toContain('video_link IS NOT NULL');
		});
	});

	describe('Indexes', () => {
		it('should create index on creator_id', () => {
			expect(schemaContent).toContain('idx_events_creator_id');
			expect(schemaContent).toContain('ON public.events(creator_id)');
		});

		it('should create index on group_id for non-null values', () => {
			expect(schemaContent).toContain('idx_events_group_id');
			expect(schemaContent).toContain('ON public.events(group_id)');
			expect(schemaContent).toContain('WHERE group_id IS NOT NULL');
		});

		it('should create index on start_time', () => {
			expect(schemaContent).toContain('idx_events_start_time');
			expect(schemaContent).toContain('ON public.events(start_time)');
		});

		it('should create index on created_at', () => {
			expect(schemaContent).toContain('idx_events_created_at');
			expect(schemaContent).toContain('ON public.events(created_at)');
		});

		it('should create index on event_type', () => {
			expect(schemaContent).toContain('idx_events_event_type');
			expect(schemaContent).toContain('ON public.events(event_type)');
		});

		it('should create index on visibility', () => {
			expect(schemaContent).toContain('idx_events_visibility');
			expect(schemaContent).toContain('ON public.events(visibility)');
		});

		it('should create composite index for discovery queries', () => {
			expect(schemaContent).toContain('idx_events_visibility_start_time');
			expect(schemaContent).toContain('ON public.events(visibility, start_time)');
		});

		it('should create GiST spatial index for map queries', () => {
			expect(schemaContent).toContain('idx_events_location');
			expect(schemaContent).toContain('ON public.events USING GIST');
			expect(schemaContent).toContain('point(venue_lng, venue_lat)');
			expect(schemaContent).toContain('WHERE venue_lat IS NOT NULL AND venue_lng IS NOT NULL');
		});
	});

	describe('Row Level Security', () => {
		it('should enable Row Level Security', () => {
			expect(schemaContent).toContain('ALTER TABLE public.events ENABLE ROW LEVEL SECURITY');
		});

		it('should create RLS policy for anyone to read public events', () => {
			expect(schemaContent).toContain('CREATE POLICY "Anyone can read public events"');
			expect(schemaContent).toContain('FOR SELECT');
			expect(schemaContent).toContain("visibility = 'public'");
		});

		it('should create RLS policy for authenticated users to read public events', () => {
			expect(schemaContent).toContain('CREATE POLICY "Authenticated users can read public events"');
			expect(schemaContent).toContain('FOR SELECT');
			expect(schemaContent).toContain("auth.role() = 'authenticated'");
			expect(schemaContent).toContain("visibility = 'public'");
		});

		it('should create RLS policy for creators to read own events', () => {
			expect(schemaContent).toContain('CREATE POLICY "Creators can read own events"');
			expect(schemaContent).toContain('FOR SELECT');
			expect(schemaContent).toContain('auth.uid() = creator_id');
		});

		it('should create RLS policy for creators to update own events', () => {
			expect(schemaContent).toContain('CREATE POLICY "Creators can update own events"');
			expect(schemaContent).toContain('FOR UPDATE');
			expect(schemaContent).toContain('USING (auth.uid() = creator_id)');
			expect(schemaContent).toContain('WITH CHECK (auth.uid() = creator_id)');
		});

		it('should create RLS policy for creators to delete own events', () => {
			expect(schemaContent).toContain('CREATE POLICY "Creators can delete own events"');
			expect(schemaContent).toContain('FOR DELETE');
			expect(schemaContent).toContain('USING (auth.uid() = creator_id)');
		});

		it('should create RLS policy for authenticated users to create events', () => {
			expect(schemaContent).toContain('CREATE POLICY "Authenticated users can create events"');
			expect(schemaContent).toContain('FOR INSERT');
			expect(schemaContent).toContain("auth.role() = 'authenticated'");
			expect(schemaContent).toContain('auth.uid() = creator_id');
		});
	});

	describe('Triggers', () => {
		it('should create trigger to update updated_at on row update', () => {
			expect(schemaContent).toContain('CREATE TRIGGER update_events_updated_at');
			expect(schemaContent).toContain('BEFORE UPDATE ON public.events');
			expect(schemaContent).toContain('EXECUTE FUNCTION update_updated_at_column()');
		});
	});

	describe('Comments', () => {
		it('should have helpful table comment', () => {
			expect(schemaContent).toContain('COMMENT ON TABLE public.events');
		});

		it('should have helpful column comments', () => {
			expect(schemaContent).toContain('COMMENT ON COLUMN public.events.id');
			expect(schemaContent).toContain('COMMENT ON COLUMN public.events.creator_id');
			expect(schemaContent).toContain('COMMENT ON COLUMN public.events.title');
			expect(schemaContent).toContain('COMMENT ON COLUMN public.events.event_type');
		});
	});
});

describe('Events Schema Business Rules', () => {
	it('should support standalone events (group_id NULL)', () => {
		expect(schemaContent).toContain('group_id UUID DEFAULT NULL');
	});

	it('should set default visibility to public', () => {
		expect(schemaContent).toContain("visibility event_visibility NOT NULL DEFAULT 'public'");
	});

	it('should allow capacity to be NULL for unlimited events', () => {
		expect(schemaContent).toContain(
			'capacity INTEGER CHECK (capacity IS NULL OR (capacity >= 1 AND capacity <= 10000))'
		);
	});
});

describe('Events Schema Acceptance Criteria', () => {
	it('AC: events table with required fields', () => {
		expect(schemaContent).toContain('CREATE TABLE IF NOT EXISTS public.events');
	});

	it('AC: event_id (id field)', () => {
		expect(schemaContent).toContain('id UUID PRIMARY KEY');
	});

	it('AC: creator_id field', () => {
		expect(schemaContent).toContain('creator_id UUID NOT NULL');
	});

	it('AC: title field', () => {
		expect(schemaContent).toContain('title TEXT NOT NULL');
	});

	it('AC: description field', () => {
		expect(schemaContent).toContain('description TEXT NOT NULL');
	});

	it('AC: start_time field', () => {
		expect(schemaContent).toContain('start_time TIMESTAMPTZ NOT NULL');
	});

	it('AC: end_time field', () => {
		expect(schemaContent).toContain('end_time TIMESTAMPTZ');
	});

	it('AC: event_type field', () => {
		expect(schemaContent).toContain('event_type event_type NOT NULL');
	});

	it('AC: venue_name field for in-person events', () => {
		expect(schemaContent).toContain('venue_name TEXT');
	});

	it('AC: venue_address field for in-person events', () => {
		expect(schemaContent).toContain('venue_address TEXT');
	});

	it('AC: RLS policies for event visibility', () => {
		expect(schemaContent).toContain('ALTER TABLE public.events ENABLE ROW LEVEL SECURITY');
		expect(schemaContent).toContain('CREATE POLICY');
	});
});
