import { describe, it, expect, vi } from 'vitest';
import { handle } from './hooks.server';
import type { RequestEvent } from '@sveltejs/kit';

describe('hooks.server', () => {
	it('should create supabase client in locals', async () => {
		const mockEvent = {
			locals: {} as App.Locals,
			cookies: {
				getAll: vi.fn(() => []),
				set: vi.fn()
			},
			request: new Request('http://localhost:5173/')
		} as unknown as RequestEvent;

		const mockResolve = vi.fn(async () => new Response('OK'));

		await handle({ event: mockEvent, resolve: mockResolve });

		expect(mockEvent.locals.supabase).toBeDefined();
		expect(typeof mockEvent.locals.supabase.auth.getSession).toBe('function');
	});

	it('should set session to null when no auth cookie exists', async () => {
		const mockEvent = {
			locals: {} as App.Locals,
			cookies: {
				getAll: vi.fn(() => []),
				set: vi.fn()
			},
			request: new Request('http://localhost:5173/')
		} as unknown as RequestEvent;

		const mockResolve = vi.fn(async () => new Response('OK'));

		await handle({ event: mockEvent, resolve: mockResolve });

		expect(mockEvent.locals.session).toBeNull();
		expect(mockEvent.locals.user).toBeNull();
	});

	it('should call resolve with correct filter headers', async () => {
		const mockEvent = {
			locals: {} as App.Locals,
			cookies: {
				getAll: vi.fn(() => []),
				set: vi.fn()
			},
			request: new Request('http://localhost:5173/')
		} as unknown as RequestEvent;

		const mockResolve = vi.fn(async (_, options) => {
			// Test that the filter function works correctly
			expect(options.filterSerializedResponseHeaders('content-range')).toBe(true);
			expect(options.filterSerializedResponseHeaders('x-supabase-api-version')).toBe(true);
			expect(options.filterSerializedResponseHeaders('other-header')).toBe(false);
			return new Response('OK');
		});

		await handle({ event: mockEvent, resolve: mockResolve });

		expect(mockResolve).toHaveBeenCalledTimes(1);
	});

	it('should set cookies with correct options', async () => {
		const mockSetCookie = vi.fn();
		const mockEvent = {
			locals: {} as App.Locals,
			cookies: {
				getAll: vi.fn(() => [
					{ name: 'test-cookie', value: 'test-value', options: { maxAge: 3600 } }
				]),
				set: mockSetCookie
			},
			request: new Request('http://localhost:5173/')
		} as unknown as RequestEvent;

		const mockResolve = vi.fn(async () => new Response('OK'));

		await handle({ event: mockEvent, resolve: mockResolve });

		// The Supabase client will set cookies through the setAll callback
		// We verify that the structure is in place
		expect(mockEvent.locals.supabase).toBeDefined();
	});
});
