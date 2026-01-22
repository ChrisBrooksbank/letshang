import { describe, it, expect, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

// Mock environment variables
vi.mock('$env/static/public', () => ({
	PUBLIC_SUPABASE_URL: 'https://test-project.supabase.co',
	PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key'
}));

vi.mock('$env/static/private', () => ({
	SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key'
}));

// Track createClient calls
let clientCalls: Array<{ url: string; key: string; options?: unknown }> = [];

// Mock @supabase/supabase-js
vi.mock('@supabase/supabase-js', () => ({
	createClient: (url: string, key: string, options?: unknown) => {
		clientCalls.push({ url, key, options });
		return {
			from: vi.fn(),
			auth: { getSession: vi.fn() },
			__mockData: { url, key, options }
		};
	}
}));

describe('Supabase client configuration', () => {
	it('should export a standard Supabase client', async () => {
		const { supabase } = await import('./supabase.js');

		expect(supabase).toBeDefined();
		expect(supabase).toHaveProperty('from');
		expect(supabase).toHaveProperty('auth');
	});

	it('should export an admin Supabase client', async () => {
		const { supabaseAdmin } = await import('./supabase.js');

		expect(supabaseAdmin).toBeDefined();
		expect(supabaseAdmin).toHaveProperty('from');
		expect(supabaseAdmin).toHaveProperty('auth');
	});

	it('should create both standard and admin clients', async () => {
		// Module already imported, check tracked calls
		expect(clientCalls.length).toBe(2);
	});

	it('should use correct URL for both clients', async () => {
		// Check that both calls used the correct URL
		expect(clientCalls[0]?.url).toBe('https://test-project.supabase.co');
		expect(clientCalls[1]?.url).toBe('https://test-project.supabase.co');
	});

	it('should use correct keys for standard and admin clients', async () => {
		// Standard client uses anon key
		expect(clientCalls[0]?.key).toBe('test-anon-key');
		// Admin client uses service role key
		expect(clientCalls[1]?.key).toBe('test-service-role-key');
	});

	it('should configure admin client with correct auth options', async () => {
		const adminCallOptions = clientCalls[1]?.options as
			| { auth?: { autoRefreshToken?: boolean; persistSession?: boolean } }
			| undefined;

		expect(adminCallOptions).toBeDefined();
		expect(adminCallOptions?.auth?.autoRefreshToken).toBe(false);
		expect(adminCallOptions?.auth?.persistSession).toBe(false);
	});

	it('should not configure special auth options for standard client', async () => {
		const standardCallOptions = clientCalls[0]?.options;

		// Standard client should not have options
		expect(standardCallOptions).toBeUndefined();
	});

	it('should export clients that match SupabaseClient interface', async () => {
		const { supabase, supabaseAdmin } = await import('./supabase.js');

		// Type assertion to ensure they conform to SupabaseClient type
		const _standardClient: SupabaseClient = supabase;
		const _adminClient: SupabaseClient = supabaseAdmin;

		// If we get here without type errors, the types are correct
		expect(_standardClient).toBeDefined();
		expect(_adminClient).toBeDefined();
	});
});
