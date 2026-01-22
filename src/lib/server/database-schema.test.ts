/**
 * Database Schema Tests
 *
 * Tests for the initial users table schema, constraints, and RLS policies.
 * These tests validate the migration file structure and expected behavior.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('Initial Users Schema Migration', () => {
	const migrationPath = resolve(
		process.cwd(),
		'supabase/migrations/20260122_initial_users_schema.sql'
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

	it('should create profile_visibility enum', () => {
		expect(migrationContent).toContain('CREATE TYPE profile_visibility');
		expect(migrationContent).toContain("'public'");
		expect(migrationContent).toContain("'members_only'");
		expect(migrationContent).toContain("'connections_only'");
	});

	it('should create users table with required fields', () => {
		expect(migrationContent).toContain('CREATE TABLE IF NOT EXISTS public.users');
		expect(migrationContent).toContain('id UUID PRIMARY KEY');
		expect(migrationContent).toContain('display_name TEXT');
		expect(migrationContent).toContain('bio TEXT');
		expect(migrationContent).toContain('profile_photo_url TEXT');
		expect(migrationContent).toContain('location TEXT');
		expect(migrationContent).toContain('profile_visibility profile_visibility');
		expect(migrationContent).toContain('created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()');
		expect(migrationContent).toContain('updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()');
	});

	it('should reference auth.users with CASCADE delete', () => {
		expect(migrationContent).toContain('REFERENCES auth.users(id) ON DELETE CASCADE');
	});

	it('should enforce display_name length constraint (2-50 chars)', () => {
		expect(migrationContent).toContain('CONSTRAINT display_name_length CHECK');
		expect(migrationContent).toMatch(/char_length\(display_name\)\s*>=\s*2/);
		expect(migrationContent).toMatch(/char_length\(display_name\)\s*<=\s*50/);
	});

	it('should enforce bio length constraint (max 500 chars)', () => {
		expect(migrationContent).toContain('bio TEXT CHECK');
		expect(migrationContent).toMatch(/char_length\(bio\)\s*<=\s*500/);
	});

	it('should set default profile_visibility to members_only', () => {
		expect(migrationContent).toContain(
			"profile_visibility profile_visibility NOT NULL DEFAULT 'members_only'"
		);
	});

	it('should create index on display_name for search', () => {
		expect(migrationContent).toContain('CREATE INDEX idx_users_display_name');
		expect(migrationContent).toContain('ON public.users(display_name)');
	});

	it('should create index on created_at for sorting', () => {
		expect(migrationContent).toContain('CREATE INDEX idx_users_created_at');
		expect(migrationContent).toContain('ON public.users(created_at)');
	});

	it('should enable Row Level Security', () => {
		expect(migrationContent).toContain('ALTER TABLE public.users ENABLE ROW LEVEL SECURITY');
	});

	it('should create RLS policy for users to read own profile', () => {
		expect(migrationContent).toContain('CREATE POLICY "Users can read own profile"');
		expect(migrationContent).toContain('FOR SELECT');
		expect(migrationContent).toContain('USING (auth.uid() = id)');
	});

	it('should create RLS policy for anyone to read public profiles', () => {
		expect(migrationContent).toContain('CREATE POLICY "Anyone can read public profiles"');
		expect(migrationContent).toContain('FOR SELECT');
		expect(migrationContent).toContain("USING (profile_visibility = 'public')");
	});

	it('should create RLS policy for authenticated users to read members_only profiles', () => {
		expect(migrationContent).toContain(
			'CREATE POLICY "Authenticated users can read members_only profiles"'
		);
		expect(migrationContent).toContain('FOR SELECT');
		expect(migrationContent).toContain("profile_visibility = 'members_only'");
		expect(migrationContent).toContain("auth.role() = 'authenticated'");
	});

	it('should create RLS policy for users to update own profile', () => {
		expect(migrationContent).toContain('CREATE POLICY "Users can update own profile"');
		expect(migrationContent).toContain('FOR UPDATE');
		expect(migrationContent).toContain('USING (auth.uid() = id)');
		expect(migrationContent).toContain('WITH CHECK (auth.uid() = id)');
	});

	it('should create RLS policy for users to insert own profile', () => {
		expect(migrationContent).toContain('CREATE POLICY "Users can insert own profile"');
		expect(migrationContent).toContain('FOR INSERT');
		expect(migrationContent).toContain('WITH CHECK (auth.uid() = id)');
	});

	it('should create updated_at trigger function', () => {
		expect(migrationContent).toContain('CREATE OR REPLACE FUNCTION update_updated_at_column()');
		expect(migrationContent).toContain('NEW.updated_at = NOW()');
		expect(migrationContent).toContain('LANGUAGE plpgsql');
	});

	it('should create trigger to update updated_at on row update', () => {
		expect(migrationContent).toContain('CREATE TRIGGER update_users_updated_at');
		expect(migrationContent).toContain('BEFORE UPDATE ON public.users');
		expect(migrationContent).toContain('EXECUTE FUNCTION update_updated_at_column()');
	});

	it('should create function to handle new user signup', () => {
		expect(migrationContent).toContain('CREATE OR REPLACE FUNCTION handle_new_user()');
		expect(migrationContent).toContain('INSERT INTO public.users');
		expect(migrationContent).toContain('LANGUAGE plpgsql SECURITY DEFINER');
	});

	it('should create trigger on auth.users insert', () => {
		expect(migrationContent).toContain('CREATE TRIGGER on_auth_user_created');
		expect(migrationContent).toContain('AFTER INSERT ON auth.users');
		expect(migrationContent).toContain('EXECUTE FUNCTION handle_new_user()');
	});

	it('should have helpful table and column comments', () => {
		expect(migrationContent).toContain('COMMENT ON TABLE public.users');
		expect(migrationContent).toContain('COMMENT ON COLUMN public.users.id');
		expect(migrationContent).toContain('COMMENT ON COLUMN public.users.display_name');
	});
});

describe('Database Schema Best Practices', () => {
	const migrationPath = resolve(
		process.cwd(),
		'supabase/migrations/20260122_initial_users_schema.sql'
	);
	let migrationContent: string;

	try {
		migrationContent = readFileSync(migrationPath, 'utf-8');
	} catch {
		migrationContent = '';
	}

	it('should use UUID for primary key', () => {
		expect(migrationContent).toContain('id UUID PRIMARY KEY');
	});

	it('should use TIMESTAMPTZ for timestamps', () => {
		expect(migrationContent).toContain('created_at TIMESTAMPTZ');
		expect(migrationContent).toContain('updated_at TIMESTAMPTZ');
	});

	it('should have created_at and updated_at fields', () => {
		expect(migrationContent).toContain('created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()');
		expect(migrationContent).toContain('updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()');
	});

	it('should use CHECK constraints for validation', () => {
		// Check for at least one CHECK constraint
		const checkConstraints = migrationContent.match(/CHECK\s*\(/gi) || [];
		expect(checkConstraints.length).toBeGreaterThan(0);
	});

	it('should have appropriate indexes', () => {
		// Check for at least one index
		const indexes = migrationContent.match(/CREATE INDEX/gi) || [];
		expect(indexes.length).toBeGreaterThan(0);
	});

	it('should enable UUID extension if needed', () => {
		expect(migrationContent).toContain('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
	});
});
