/**
 * Events Schema Tests
 *
 * Tests for the events table schema, constraints, and RLS policies.
 * These tests validate the migration file structure and expected behavior.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('Events Schema Migration', () => {
	const migrationPath = resolve(process.cwd(), 'supabase/migrations/20260122_events_schema.sql');
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
		it('should create event_type enum', () => {
			expect(migrationContent).toContain('CREATE TYPE event_type');
			expect(migrationContent).toContain("'in_person'");
			expect(migrationContent).toContain("'online'");
			expect(migrationContent).toContain("'hybrid'");
		});

		it('should create event_visibility enum', () => {
			expect(migrationContent).toContain('CREATE TYPE event_visibility');
			expect(migrationContent).toContain("'public'");
			expect(migrationContent).toContain("'group_only'");
			expect(migrationContent).toContain("'hidden'");
		});
	});

	describe('Table Structure', () => {
		it('should create events table with required fields', () => {
			expect(migrationContent).toContain('CREATE TABLE IF NOT EXISTS public.events');
			expect(migrationContent).toContain('id UUID PRIMARY KEY');
			expect(migrationContent).toContain('creator_id UUID NOT NULL');
			expect(migrationContent).toContain('group_id UUID DEFAULT NULL');
			expect(migrationContent).toContain('title TEXT NOT NULL');
			expect(migrationContent).toContain('description TEXT NOT NULL');
			expect(migrationContent).toContain('event_type event_type NOT NULL');
			expect(migrationContent).toContain('start_time TIMESTAMPTZ NOT NULL');
			expect(migrationContent).toContain('end_time TIMESTAMPTZ');
		});

		it('should reference users table with CASCADE delete', () => {
			expect(migrationContent).toContain('REFERENCES public.users(id) ON DELETE CASCADE');
		});

		it('should have location fields for in-person events', () => {
			expect(migrationContent).toContain('venue_name TEXT');
			expect(migrationContent).toContain('venue_address TEXT');
			expect(migrationContent).toContain('venue_lat DECIMAL(10, 8)');
			expect(migrationContent).toContain('venue_lng DECIMAL(11, 8)');
		});

		it('should have video_link field for online events', () => {
			expect(migrationContent).toContain('video_link TEXT');
		});

		it('should have capacity field with constraints', () => {
			expect(migrationContent).toContain('capacity INTEGER');
		});

		it('should have metadata fields', () => {
			expect(migrationContent).toContain('created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()');
			expect(migrationContent).toContain('updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()');
		});
	});

	describe('Constraints', () => {
		it('should enforce title length constraint (5-100 chars)', () => {
			expect(migrationContent).toContain('title TEXT NOT NULL CHECK');
			expect(migrationContent).toMatch(/char_length\(title\)\s*>=\s*5/);
			expect(migrationContent).toMatch(/char_length\(title\)\s*<=\s*100/);
		});

		it('should enforce description length constraint (max 5000 chars)', () => {
			expect(migrationContent).toContain('description TEXT NOT NULL CHECK');
			expect(migrationContent).toMatch(/char_length\(description\)\s*<=\s*5000/);
		});

		it('should enforce capacity constraint (1-10000)', () => {
			expect(migrationContent).toMatch(/capacity\s+INTEGER\s+CHECK.*capacity\s*>=\s*1/);
			expect(migrationContent).toMatch(/capacity.*<=\s*10000/);
		});

		it('should enforce end_time after start_time constraint', () => {
			expect(migrationContent).toContain('CONSTRAINT end_time_after_start CHECK');
			expect(migrationContent).toContain('end_time > start_time');
		});

		it('should enforce positive duration constraint', () => {
			expect(migrationContent).toContain('CONSTRAINT duration_positive CHECK');
			expect(migrationContent).toContain('duration_minutes > 0');
		});

		it('should enforce in_person events have venue', () => {
			expect(migrationContent).toContain('CONSTRAINT in_person_has_venue CHECK');
			expect(migrationContent).toContain("event_type != 'in_person'");
			expect(migrationContent).toContain('venue_name IS NOT NULL');
			expect(migrationContent).toContain('venue_address IS NOT NULL');
		});

		it('should enforce online events have video link', () => {
			expect(migrationContent).toContain('CONSTRAINT online_has_link CHECK');
			expect(migrationContent).toContain("event_type != 'online'");
			expect(migrationContent).toContain('video_link IS NOT NULL');
		});

		it('should enforce hybrid events have both venue and link', () => {
			expect(migrationContent).toContain('CONSTRAINT hybrid_has_both CHECK');
			expect(migrationContent).toContain("event_type != 'hybrid'");
			expect(migrationContent).toContain('venue_name IS NOT NULL');
			expect(migrationContent).toContain('venue_address IS NOT NULL');
			expect(migrationContent).toContain('video_link IS NOT NULL');
		});
	});

	describe('Indexes', () => {
		it('should create index on creator_id', () => {
			expect(migrationContent).toContain('CREATE INDEX idx_events_creator_id');
			expect(migrationContent).toContain('ON public.events(creator_id)');
		});

		it('should create index on group_id for non-null values', () => {
			expect(migrationContent).toContain('CREATE INDEX idx_events_group_id');
			expect(migrationContent).toContain('ON public.events(group_id)');
			expect(migrationContent).toContain('WHERE group_id IS NOT NULL');
		});

		it('should create index on start_time', () => {
			expect(migrationContent).toContain('CREATE INDEX idx_events_start_time');
			expect(migrationContent).toContain('ON public.events(start_time)');
		});

		it('should create index on created_at', () => {
			expect(migrationContent).toContain('CREATE INDEX idx_events_created_at');
			expect(migrationContent).toContain('ON public.events(created_at)');
		});

		it('should create index on event_type', () => {
			expect(migrationContent).toContain('CREATE INDEX idx_events_event_type');
			expect(migrationContent).toContain('ON public.events(event_type)');
		});

		it('should create index on visibility', () => {
			expect(migrationContent).toContain('CREATE INDEX idx_events_visibility');
			expect(migrationContent).toContain('ON public.events(visibility)');
		});

		it('should create composite index for discovery queries', () => {
			expect(migrationContent).toContain('CREATE INDEX idx_events_visibility_start_time');
			expect(migrationContent).toContain('ON public.events(visibility, start_time)');
		});

		it('should create GiST spatial index for map queries', () => {
			expect(migrationContent).toContain('CREATE INDEX idx_events_location');
			expect(migrationContent).toContain('ON public.events USING GIST');
			expect(migrationContent).toContain('point(venue_lng, venue_lat)');
			expect(migrationContent).toContain('WHERE venue_lat IS NOT NULL AND venue_lng IS NOT NULL');
		});
	});

	describe('Row Level Security', () => {
		it('should enable Row Level Security', () => {
			expect(migrationContent).toContain('ALTER TABLE public.events ENABLE ROW LEVEL SECURITY');
		});

		it('should create RLS policy for anyone to read public events', () => {
			expect(migrationContent).toContain('CREATE POLICY "Anyone can read public events"');
			expect(migrationContent).toContain('FOR SELECT');
			expect(migrationContent).toContain("visibility = 'public'");
		});

		it('should create RLS policy for authenticated users to read public events', () => {
			expect(migrationContent).toContain(
				'CREATE POLICY "Authenticated users can read public events"'
			);
			expect(migrationContent).toContain('FOR SELECT');
			expect(migrationContent).toContain("auth.role() = 'authenticated'");
			expect(migrationContent).toContain("visibility = 'public'");
		});

		it('should create RLS policy for creators to read own events', () => {
			expect(migrationContent).toContain('CREATE POLICY "Creators can read own events"');
			expect(migrationContent).toContain('FOR SELECT');
			expect(migrationContent).toContain('auth.uid() = creator_id');
		});

		it('should create RLS policy for creators to update own events', () => {
			expect(migrationContent).toContain('CREATE POLICY "Creators can update own events"');
			expect(migrationContent).toContain('FOR UPDATE');
			expect(migrationContent).toContain('USING (auth.uid() = creator_id)');
			expect(migrationContent).toContain('WITH CHECK (auth.uid() = creator_id)');
		});

		it('should create RLS policy for creators to delete own events', () => {
			expect(migrationContent).toContain('CREATE POLICY "Creators can delete own events"');
			expect(migrationContent).toContain('FOR DELETE');
			expect(migrationContent).toContain('USING (auth.uid() = creator_id)');
		});

		it('should create RLS policy for authenticated users to create events', () => {
			expect(migrationContent).toContain('CREATE POLICY "Authenticated users can create events"');
			expect(migrationContent).toContain('FOR INSERT');
			expect(migrationContent).toContain("auth.role() = 'authenticated'");
			expect(migrationContent).toContain('auth.uid() = creator_id');
		});
	});

	describe('Triggers', () => {
		it('should create trigger to update updated_at on row update', () => {
			expect(migrationContent).toContain('CREATE TRIGGER update_events_updated_at');
			expect(migrationContent).toContain('BEFORE UPDATE ON public.events');
			expect(migrationContent).toContain('EXECUTE FUNCTION update_updated_at_column()');
		});
	});

	describe('Comments', () => {
		it('should have helpful table comment', () => {
			expect(migrationContent).toContain('COMMENT ON TABLE public.events');
		});

		it('should have helpful column comments', () => {
			expect(migrationContent).toContain('COMMENT ON COLUMN public.events.id');
			expect(migrationContent).toContain('COMMENT ON COLUMN public.events.creator_id');
			expect(migrationContent).toContain('COMMENT ON COLUMN public.events.title');
			expect(migrationContent).toContain('COMMENT ON COLUMN public.events.event_type');
		});
	});
});

describe('Events Schema Business Rules', () => {
	it('should support standalone events (group_id NULL)', () => {
		const migrationPath = resolve(process.cwd(), 'supabase/migrations/20260122_events_schema.sql');
		const migrationContent = readFileSync(migrationPath, 'utf-8');

		expect(migrationContent).toContain('group_id UUID DEFAULT NULL');
	});

	it('should set default visibility to public', () => {
		const migrationPath = resolve(process.cwd(), 'supabase/migrations/20260122_events_schema.sql');
		const migrationContent = readFileSync(migrationPath, 'utf-8');

		expect(migrationContent).toContain("visibility event_visibility NOT NULL DEFAULT 'public'");
	});

	it('should allow capacity to be NULL for unlimited events', () => {
		const migrationPath = resolve(process.cwd(), 'supabase/migrations/20260122_events_schema.sql');
		const migrationContent = readFileSync(migrationPath, 'utf-8');

		expect(migrationContent).toContain(
			'capacity INTEGER CHECK (capacity IS NULL OR (capacity >= 1 AND capacity <= 10000))'
		);
	});
});

describe('Events Schema Acceptance Criteria', () => {
	const migrationPath = resolve(process.cwd(), 'supabase/migrations/20260122_events_schema.sql');
	const migrationContent = readFileSync(migrationPath, 'utf-8');

	it('AC: events table with required fields', () => {
		expect(migrationContent).toContain('CREATE TABLE IF NOT EXISTS public.events');
	});

	it('AC: event_id (id field)', () => {
		expect(migrationContent).toContain('id UUID PRIMARY KEY');
	});

	it('AC: creator_id field', () => {
		expect(migrationContent).toContain('creator_id UUID NOT NULL');
	});

	it('AC: title field', () => {
		expect(migrationContent).toContain('title TEXT NOT NULL');
	});

	it('AC: description field', () => {
		expect(migrationContent).toContain('description TEXT NOT NULL');
	});

	it('AC: start_time field', () => {
		expect(migrationContent).toContain('start_time TIMESTAMPTZ NOT NULL');
	});

	it('AC: end_time field', () => {
		expect(migrationContent).toContain('end_time TIMESTAMPTZ');
	});

	it('AC: event_type field', () => {
		expect(migrationContent).toContain('event_type event_type NOT NULL');
	});

	it('AC: venue_name field for in-person events', () => {
		expect(migrationContent).toContain('venue_name TEXT');
	});

	it('AC: venue_address field for in-person events', () => {
		expect(migrationContent).toContain('venue_address TEXT');
	});

	it('AC: RLS policies for event visibility', () => {
		expect(migrationContent).toContain('ALTER TABLE public.events ENABLE ROW LEVEL SECURITY');
		expect(migrationContent).toContain('CREATE POLICY');
	});
});
