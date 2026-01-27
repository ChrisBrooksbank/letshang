/**
 * Tests for iCal Export API Endpoint
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './+server';
import { supabase } from '$lib/server/supabase';

// Mock Supabase
vi.mock('$lib/server/supabase', () => ({
	supabase: {
		from: vi.fn()
	}
}));

describe('GET /events/[id]/ical', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should return 401 if not authenticated', async () => {
		const request = new Request('http://localhost/events/event-1/ical');
		const locals = { session: null };
		const params = { id: 'event-1' };
		const url = new URL('http://localhost/events/event-1/ical');

		await expect(GET({ request, locals, params, url } as never)).rejects.toThrow();
	});

	it('should return 404 if event not found', async () => {
		const mockSelect = vi.fn().mockReturnValue({
			eq: vi.fn().mockReturnValue({
				single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } })
			})
		});

		vi.mocked(supabase.from).mockReturnValue({ select: mockSelect } as never);

		const request = new Request('http://localhost/events/event-1/ical');
		const locals = { session: { user: { id: 'user-1' } } };
		const params = { id: 'event-1' };
		const url = new URL('http://localhost/events/event-1/ical');

		await expect(GET({ request, locals, params, url } as never)).rejects.toThrow();
	});

	it('should export public event for any authenticated user', async () => {
		const mockEvent = {
			id: 'event-1',
			title: 'Tech Meetup',
			description: 'A great tech meetup',
			start_time: '2026-02-01T19:00:00Z',
			end_time: '2026-02-01T21:00:00Z',
			event_type: 'in_person',
			venue_name: 'Tech Hub',
			venue_address: '123 Main St',
			visibility: 'public',
			creator_id: 'creator-1',
			group_id: null,
			profiles: {
				display_name: 'John Doe',
				email: 'john@example.com'
			}
		};

		const mockSelect = vi.fn().mockReturnValue({
			eq: vi.fn().mockReturnValue({
				single: vi.fn().mockResolvedValue({ data: mockEvent, error: null })
			})
		});

		vi.mocked(supabase.from).mockReturnValue({ select: mockSelect } as never);

		const request = new Request('http://localhost/events/event-1/ical');
		const locals = { session: { user: { id: 'user-1' } } };
		const params = { id: 'event-1' };
		const url = new URL('http://localhost/events/event-1/ical');

		const response = await GET({ request, locals, params, url } as never);

		expect(response.status).toBe(200);
		expect(response.headers.get('Content-Type')).toBe('text/calendar; charset=utf-8');
		expect(response.headers.get('Content-Disposition')).toContain('attachment');
		expect(response.headers.get('Content-Disposition')).toContain('tech-meetup.ics');

		const body = await response.text();
		expect(body).toContain('BEGIN:VCALENDAR');
		expect(body).toContain('SUMMARY:Tech Meetup');
		expect(body).toContain('DESCRIPTION:A great tech meetup');
		expect(body).toContain('LOCATION:Tech Hub\\, 123 Main St');
		expect(body).toContain('URL:http://localhost/events/event-1');
		expect(body).toContain('ORGANIZER:CN=John Doe:mailto:john@example.com');
	});

	it('should return 403 for group-only event if user not a member', async () => {
		const mockEvent = {
			id: 'event-1',
			title: 'Group Event',
			visibility: 'group_only',
			group_id: 'group-1',
			creator_id: 'creator-1'
		};

		const mockEventSelect = vi.fn().mockReturnValue({
			eq: vi.fn().mockReturnValue({
				single: vi.fn().mockResolvedValue({ data: mockEvent, error: null })
			})
		});

		const mockMembershipSelect = vi.fn().mockReturnValue({
			eq: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({ data: null, error: null })
		});

		vi.mocked(supabase.from)
			.mockReturnValueOnce({ select: mockEventSelect } as never)
			.mockReturnValueOnce({ select: mockMembershipSelect } as never);

		const request = new Request('http://localhost/events/event-1/ical');
		const locals = { session: { user: { id: 'user-1' } } };
		const params = { id: 'event-1' };
		const url = new URL('http://localhost/events/event-1/ical');

		await expect(GET({ request, locals, params, url } as never)).rejects.toThrow();
	});

	it('should export group-only event if user is a member', async () => {
		const mockEvent = {
			id: 'event-1',
			title: 'Group Event',
			description: 'Group members only',
			start_time: '2026-02-01T19:00:00Z',
			end_time: null,
			event_type: 'online',
			venue_name: null,
			venue_address: null,
			visibility: 'group_only',
			group_id: 'group-1',
			creator_id: 'creator-1',
			profiles: {
				display_name: 'Jane Smith',
				email: 'jane@example.com'
			}
		};

		const mockEventSelect = vi.fn().mockReturnValue({
			eq: vi.fn().mockReturnValue({
				single: vi.fn().mockResolvedValue({ data: mockEvent, error: null })
			})
		});

		const mockMembershipSelect = vi.fn().mockReturnValue({
			eq: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({ data: { id: 'member-1' }, error: null })
		});

		vi.mocked(supabase.from)
			.mockReturnValueOnce({ select: mockEventSelect } as never)
			.mockReturnValueOnce({ select: mockMembershipSelect } as never);

		const request = new Request('http://localhost/events/event-1/ical');
		const locals = { session: { user: { id: 'user-1' } } };
		const params = { id: 'event-1' };
		const url = new URL('http://localhost/events/event-1/ical');

		const response = await GET({ request, locals, params, url } as never);

		expect(response.status).toBe(200);

		const body = await response.text();
		expect(body).toContain('SUMMARY:Group Event');
	});

	it('should return 403 for hidden event if user is not creator', async () => {
		const mockEvent = {
			id: 'event-1',
			title: 'Hidden Event',
			visibility: 'hidden',
			creator_id: 'creator-1',
			group_id: null
		};

		const mockSelect = vi.fn().mockReturnValue({
			eq: vi.fn().mockReturnValue({
				single: vi.fn().mockResolvedValue({ data: mockEvent, error: null })
			})
		});

		vi.mocked(supabase.from).mockReturnValue({ select: mockSelect } as never);

		const request = new Request('http://localhost/events/event-1/ical');
		const locals = { session: { user: { id: 'user-1' } } };
		const params = { id: 'event-1' };
		const url = new URL('http://localhost/events/event-1/ical');

		await expect(GET({ request, locals, params, url } as never)).rejects.toThrow();
	});

	it('should export hidden event if user is creator', async () => {
		const mockEvent = {
			id: 'event-1',
			title: 'Hidden Event',
			description: 'Creator only',
			start_time: '2026-02-01T19:00:00Z',
			end_time: null,
			event_type: 'in_person',
			venue_name: 'Secret Location',
			venue_address: null,
			visibility: 'hidden',
			creator_id: 'creator-1',
			group_id: null,
			profiles: {
				display_name: 'Creator Name',
				email: null
			}
		};

		const mockSelect = vi.fn().mockReturnValue({
			eq: vi.fn().mockReturnValue({
				single: vi.fn().mockResolvedValue({ data: mockEvent, error: null })
			})
		});

		vi.mocked(supabase.from).mockReturnValue({ select: mockSelect } as never);

		const request = new Request('http://localhost/events/event-1/ical');
		const locals = { session: { user: { id: 'creator-1' } } };
		const params = { id: 'event-1' };
		const url = new URL('http://localhost/events/event-1/ical');

		const response = await GET({ request, locals, params, url } as never);

		expect(response.status).toBe(200);

		const body = await response.text();
		expect(body).toContain('SUMMARY:Hidden Event');
		expect(body).toContain('LOCATION:Secret Location');
	});

	it('should handle online event without location', async () => {
		const mockEvent = {
			id: 'event-1',
			title: 'Online Webinar',
			description: 'A great webinar',
			start_time: '2026-02-01T19:00:00Z',
			end_time: '2026-02-01T20:00:00Z',
			event_type: 'online',
			venue_name: null,
			venue_address: null,
			visibility: 'public',
			creator_id: 'creator-1',
			group_id: null,
			profiles: {
				display_name: 'Speaker One',
				email: 'speaker@example.com'
			}
		};

		const mockSelect = vi.fn().mockReturnValue({
			eq: vi.fn().mockReturnValue({
				single: vi.fn().mockResolvedValue({ data: mockEvent, error: null })
			})
		});

		vi.mocked(supabase.from).mockReturnValue({ select: mockSelect } as never);

		const request = new Request('http://localhost/events/event-1/ical');
		const locals = { session: { user: { id: 'user-1' } } };
		const params = { id: 'event-1' };
		const url = new URL('http://localhost/events/event-1/ical');

		const response = await GET({ request, locals, params, url } as never);

		expect(response.status).toBe(200);

		const body = await response.text();
		expect(body).toContain('SUMMARY:Online Webinar');
		expect(body).not.toContain('LOCATION:');
	});

	it('should handle hybrid event with location', async () => {
		const mockEvent = {
			id: 'event-1',
			title: 'Hybrid Conference',
			description: 'Join us in person or online',
			start_time: '2026-02-01T09:00:00Z',
			end_time: '2026-02-01T17:00:00Z',
			event_type: 'hybrid',
			venue_name: 'Convention Center',
			venue_address: '456 Conference Blvd',
			visibility: 'public',
			creator_id: 'creator-1',
			group_id: null,
			profiles: {
				display_name: 'Event Organizer',
				email: 'organizer@example.com'
			}
		};

		const mockSelect = vi.fn().mockReturnValue({
			eq: vi.fn().mockReturnValue({
				single: vi.fn().mockResolvedValue({ data: mockEvent, error: null })
			})
		});

		vi.mocked(supabase.from).mockReturnValue({ select: mockSelect } as never);

		const request = new Request('http://localhost/events/event-1/ical');
		const locals = { session: { user: { id: 'user-1' } } };
		const params = { id: 'event-1' };
		const url = new URL('http://localhost/events/event-1/ical');

		const response = await GET({ request, locals, params, url } as never);

		expect(response.status).toBe(200);

		const body = await response.text();
		expect(body).toContain('SUMMARY:Hybrid Conference');
		expect(body).toContain('LOCATION:Convention Center\\, 456 Conference Blvd');
	});

	it('should handle event without organizer profile', async () => {
		const mockEvent = {
			id: 'event-1',
			title: 'Event Without Profile',
			description: null,
			start_time: '2026-02-01T19:00:00Z',
			end_time: null,
			event_type: 'in_person',
			venue_name: 'Community Center',
			venue_address: null,
			visibility: 'public',
			creator_id: 'creator-1',
			group_id: null,
			profiles: null
		};

		const mockSelect = vi.fn().mockReturnValue({
			eq: vi.fn().mockReturnValue({
				single: vi.fn().mockResolvedValue({ data: mockEvent, error: null })
			})
		});

		vi.mocked(supabase.from).mockReturnValue({ select: mockSelect } as never);

		const request = new Request('http://localhost/events/event-1/ical');
		const locals = { session: { user: { id: 'user-1' } } };
		const params = { id: 'event-1' };
		const url = new URL('http://localhost/events/event-1/ical');

		const response = await GET({ request, locals, params, url } as never);

		expect(response.status).toBe(200);

		const body = await response.text();
		expect(body).toContain('ORGANIZER:LetsHang User');
	});
});
