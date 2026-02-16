/**
 * Database Schema Tests
 *
 * Tests for the users table schema, constraints, and RLS policies.
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

describe('Users Schema', () => {
	it('should have schema file present', () => {
		expect(schemaContent).toBeTruthy();
		expect(schemaContent.length).toBeGreaterThan(0);
	});

	it('should create profile_visibility enum', () => {
		expect(schemaContent).toContain('CREATE TYPE profile_visibility');
		expect(schemaContent).toContain("'public'");
		expect(schemaContent).toContain("'members_only'");
		expect(schemaContent).toContain("'connections_only'");
	});

	it('should create users table with required fields', () => {
		expect(schemaContent).toContain('CREATE TABLE IF NOT EXISTS public.users');
		expect(schemaContent).toContain('id UUID PRIMARY KEY');
		expect(schemaContent).toContain('display_name TEXT');
		expect(schemaContent).toContain('bio TEXT');
		expect(schemaContent).toContain('profile_photo_url TEXT');
		expect(schemaContent).toContain('location TEXT');
		expect(schemaContent).toContain('profile_visibility profile_visibility');
		expect(schemaContent).toContain('created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()');
		expect(schemaContent).toContain('updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()');
	});

	it('should reference auth.users with CASCADE delete', () => {
		expect(schemaContent).toContain('REFERENCES auth.users(id) ON DELETE CASCADE');
	});

	it('should enforce display_name length constraint (2-50 chars)', () => {
		expect(schemaContent).toContain('CONSTRAINT display_name_length CHECK');
		expect(schemaContent).toMatch(/char_length\(display_name\)\s*>=\s*2/);
		expect(schemaContent).toMatch(/char_length\(display_name\)\s*<=\s*50/);
	});

	it('should enforce bio length constraint (max 500 chars)', () => {
		expect(schemaContent).toContain('bio TEXT CHECK');
		expect(schemaContent).toMatch(/char_length\(bio\)\s*<=\s*500/);
	});

	it('should set default profile_visibility to members_only', () => {
		expect(schemaContent).toContain(
			"profile_visibility profile_visibility NOT NULL DEFAULT 'members_only'"
		);
	});

	it('should create index on display_name for search', () => {
		expect(schemaContent).toContain('idx_users_display_name');
		expect(schemaContent).toContain('ON public.users(display_name)');
	});

	it('should create index on created_at for sorting', () => {
		expect(schemaContent).toContain('idx_users_created_at');
		expect(schemaContent).toContain('ON public.users(created_at)');
	});

	it('should enable Row Level Security', () => {
		expect(schemaContent).toContain('ALTER TABLE public.users ENABLE ROW LEVEL SECURITY');
	});

	it('should create RLS policy for users to read own profile', () => {
		expect(schemaContent).toContain('CREATE POLICY "Users can read own profile"');
		expect(schemaContent).toContain('FOR SELECT');
		expect(schemaContent).toContain('USING (auth.uid() = id)');
	});

	it('should create RLS policy for anyone to read public profiles', () => {
		expect(schemaContent).toContain('CREATE POLICY "Anyone can read public profiles"');
		expect(schemaContent).toContain('FOR SELECT');
		expect(schemaContent).toContain("USING (profile_visibility = 'public')");
	});

	it('should create RLS policy for authenticated users to read members_only profiles', () => {
		expect(schemaContent).toContain(
			'CREATE POLICY "Authenticated users can read members_only profiles"'
		);
		expect(schemaContent).toContain('FOR SELECT');
		expect(schemaContent).toContain("profile_visibility = 'members_only'");
		expect(schemaContent).toContain("auth.role() = 'authenticated'");
	});

	it('should create RLS policy for users to update own profile', () => {
		expect(schemaContent).toContain('CREATE POLICY "Users can update own profile"');
		expect(schemaContent).toContain('FOR UPDATE');
		expect(schemaContent).toContain('USING (auth.uid() = id)');
		expect(schemaContent).toContain('WITH CHECK (auth.uid() = id)');
	});

	it('should create RLS policy for users to insert own profile', () => {
		expect(schemaContent).toContain('CREATE POLICY "Users can insert own profile"');
		expect(schemaContent).toContain('FOR INSERT');
		expect(schemaContent).toContain('WITH CHECK (auth.uid() = id)');
	});

	it('should create updated_at trigger function', () => {
		expect(schemaContent).toContain('CREATE OR REPLACE FUNCTION update_updated_at_column()');
		expect(schemaContent).toContain('NEW.updated_at = NOW()');
		expect(schemaContent).toContain('LANGUAGE plpgsql');
	});

	it('should create trigger to update updated_at on row update', () => {
		expect(schemaContent).toContain('CREATE TRIGGER update_users_updated_at');
		expect(schemaContent).toContain('BEFORE UPDATE ON public.users');
		expect(schemaContent).toContain('EXECUTE FUNCTION update_updated_at_column()');
	});

	it('should create function to handle new user signup', () => {
		expect(schemaContent).toContain('CREATE OR REPLACE FUNCTION handle_new_user()');
		expect(schemaContent).toContain('INSERT INTO public.users');
		expect(schemaContent).toContain('LANGUAGE plpgsql SECURITY DEFINER');
	});

	it('should create trigger on auth.users insert', () => {
		expect(schemaContent).toContain('CREATE TRIGGER on_auth_user_created');
		expect(schemaContent).toContain('AFTER INSERT ON auth.users');
		expect(schemaContent).toContain('EXECUTE FUNCTION handle_new_user()');
	});

	it('should have helpful table and column comments', () => {
		expect(schemaContent).toContain('COMMENT ON TABLE public.users');
		expect(schemaContent).toContain('COMMENT ON COLUMN public.users.id');
		expect(schemaContent).toContain('COMMENT ON COLUMN public.users.display_name');
	});
});

describe('Database Schema Best Practices', () => {
	it('should use UUID for primary key', () => {
		expect(schemaContent).toContain('id UUID PRIMARY KEY');
	});

	it('should use TIMESTAMPTZ for timestamps', () => {
		expect(schemaContent).toContain('created_at TIMESTAMPTZ');
		expect(schemaContent).toContain('updated_at TIMESTAMPTZ');
	});

	it('should have created_at and updated_at fields', () => {
		expect(schemaContent).toContain('created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()');
		expect(schemaContent).toContain('updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()');
	});

	it('should use CHECK constraints for validation', () => {
		const checkConstraints = schemaContent.match(/CHECK\s*\(/gi) || [];
		expect(checkConstraints.length).toBeGreaterThan(0);
	});

	it('should have appropriate indexes', () => {
		const indexes = schemaContent.match(/CREATE INDEX/gi) || [];
		expect(indexes.length).toBeGreaterThan(0);
	});

	it('should enable UUID extension if needed', () => {
		expect(schemaContent).toContain('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
	});
});
