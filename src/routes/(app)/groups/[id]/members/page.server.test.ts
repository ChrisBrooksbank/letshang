import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Supabase client - must be declared before imports
vi.mock('$lib/server/supabase', () => ({
	supabase: {
		from: vi.fn()
	}
}));

import { actions } from './+page.server';
import { supabase } from '$lib/server/supabase';

const mockSupabase = supabase as any;

describe('Group Members Page Server - Join Request Actions', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('approveRequest action', () => {
		it('should approve a pending join request', async () => {
			const mockCurrentMembership = {
				id: 'member-1',
				role: 'organizer'
			};

			const mockPendingRequest = {
				id: 'pending-1',
				status: 'pending'
			};

			let updateCalled = false;

			mockSupabase.from.mockImplementation((table: string) => {
				if (table === 'group_members') {
					// Return different responses based on query chain
					return {
						select: vi.fn().mockReturnValue({
							eq: vi.fn().mockReturnValue({
								eq: vi.fn().mockReturnValue({
									eq: vi.fn().mockReturnValue({
										single: vi.fn().mockImplementation(() => {
											// First call returns current user membership
											if (!updateCalled) {
												return Promise.resolve({ data: mockCurrentMembership, error: null });
											}
											// Second call returns the pending request
											return Promise.resolve({ data: mockPendingRequest, error: null });
										})
									})
								})
							})
						}),
						update: vi.fn().mockReturnValue({
							eq: vi.fn().mockReturnValue({
								eq: vi.fn().mockImplementation(() => {
									updateCalled = true;
									return Promise.resolve({ error: null });
								})
							})
						})
					};
				}
				return {};
			});

			const locals = { session: { user: { id: 'user-organizer' } } };
			const params = { id: 'group-1' };
			const request = {
				formData: async () => ({
					get: (key: string): string | null => (key === 'memberId' ? 'pending-1' : null)
				})
			};

			const result: any = await actions.approveRequest({ params, locals, request } as any);

			expect(result.success).toBe(true);
			expect(result.message).toContain('approved');
		});

		it('should reject approval if user is not leadership', async () => {
			const mockCurrentMembership = {
				id: 'member-1',
				role: 'member'
			};

			mockSupabase.from.mockReturnValue({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							eq: vi.fn().mockReturnValue({
								single: vi.fn().mockResolvedValue({ data: mockCurrentMembership, error: null })
							})
						})
					})
				})
			});

			const locals = { session: { user: { id: 'user-member' } } };
			const params = { id: 'group-1' };
			const request = {
				formData: async () => ({
					get: (key: string): string | null => (key === 'memberId' ? 'pending-1' : null)
				})
			};

			const result: any = await actions.approveRequest({ params, locals, request } as any);

			expect(result.success).toBe(false);
			expect(result.message).toContain('leadership');
		});

		it('should handle non-existent join request', async () => {
			const mockCurrentMembership = {
				id: 'member-1',
				role: 'organizer'
			};

			let callCount = 0;
			mockSupabase.from.mockReturnValue({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							eq: vi.fn().mockReturnValue({
								single: vi.fn().mockImplementation(() => {
									callCount++;
									if (callCount === 1) {
										// First call returns current user membership
										return Promise.resolve({ data: mockCurrentMembership, error: null });
									}
									// Second call returns no pending request
									return Promise.resolve({ data: null, error: { message: 'Not found' } });
								})
							})
						})
					})
				})
			});

			const locals = { session: { user: { id: 'user-organizer' } } };
			const params = { id: 'group-1' };
			const request = {
				formData: async () => ({
					get: (key: string): string | null => (key === 'memberId' ? 'non-existent' : null)
				})
			};

			const result: any = await actions.approveRequest({ params, locals, request } as any);

			expect(result.success).toBe(false);
			expect(result.message).toContain('not found');
		});

		it('should redirect to login if user is not authenticated', async () => {
			const locals = { session: null };
			const params = { id: 'group-1' };
			const request = {
				formData: async () => ({
					get: (key: string): string | null => (key === 'memberId' ? 'pending-1' : null)
				})
			};

			await expect(actions.approveRequest({ params, locals, request } as any)).rejects.toThrow();
		});
	});

	describe('denyRequest action', () => {
		it('should deny a pending join request', async () => {
			const mockCurrentMembership = {
				id: 'member-1',
				role: 'organizer'
			};

			const mockPendingRequest = {
				id: 'pending-1',
				status: 'pending'
			};

			let deleteCalled = false;

			mockSupabase.from.mockImplementation((table: string) => {
				if (table === 'group_members') {
					return {
						select: vi.fn().mockReturnValue({
							eq: vi.fn().mockReturnValue({
								eq: vi.fn().mockReturnValue({
									eq: vi.fn().mockReturnValue({
										single: vi.fn().mockImplementation(() => {
											if (!deleteCalled) {
												return Promise.resolve({ data: mockCurrentMembership, error: null });
											}
											return Promise.resolve({ data: mockPendingRequest, error: null });
										})
									})
								})
							})
						}),
						delete: vi.fn().mockReturnValue({
							eq: vi.fn().mockReturnValue({
								eq: vi.fn().mockImplementation(() => {
									deleteCalled = true;
									return Promise.resolve({ error: null });
								})
							})
						})
					};
				}
				return {};
			});

			const locals = { session: { user: { id: 'user-organizer' } } };
			const params = { id: 'group-1' };
			const request = {
				formData: async () => ({
					get: (key: string): string | null => (key === 'memberId' ? 'pending-1' : null)
				})
			};

			const result: any = await actions.denyRequest({ params, locals, request } as any);

			expect(result.success).toBe(true);
			expect(result.message).toContain('denied');
		});

		it('should accept optional denial message', async () => {
			const mockCurrentMembership = {
				id: 'member-1',
				role: 'organizer'
			};

			const mockPendingRequest = {
				id: 'pending-1',
				status: 'pending'
			};

			mockSupabase.from.mockImplementation((table: string) => {
				if (table === 'group_members') {
					let callCount = 0;
					return {
						select: vi.fn().mockReturnValue({
							eq: vi.fn().mockReturnValue({
								eq: vi.fn().mockReturnValue({
									eq: vi.fn().mockReturnValue({
										single: vi.fn().mockImplementation(() => {
											callCount++;
											if (callCount === 1) {
												return Promise.resolve({ data: mockCurrentMembership, error: null });
											}
											return Promise.resolve({ data: mockPendingRequest, error: null });
										})
									})
								})
							})
						}),
						delete: vi.fn().mockReturnValue({
							eq: vi.fn().mockReturnValue({
								eq: vi.fn().mockResolvedValue({ error: null })
							})
						})
					};
				}
				return {};
			});

			const locals = { session: { user: { id: 'user-organizer' } } };
			const params = { id: 'group-1' };
			const request = {
				formData: async () => ({
					get: (key: string): string | null => {
						if (key === 'memberId') return 'pending-1';
						if (key === 'message') return 'We are not accepting new members at this time.';
						return null;
					}
				})
			};

			const result: any = await actions.denyRequest({ params, locals, request } as any);

			expect(result.success).toBe(true);
		});

		it('should reject denial if user is not leadership', async () => {
			const mockCurrentMembership = {
				id: 'member-1',
				role: 'event_organizer'
			};

			mockSupabase.from.mockReturnValue({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							eq: vi.fn().mockReturnValue({
								single: vi.fn().mockResolvedValue({ data: mockCurrentMembership, error: null })
							})
						})
					})
				})
			});

			const locals = { session: { user: { id: 'user-event-org' } } };
			const params = { id: 'group-1' };
			const request = {
				formData: async () => ({
					get: (key: string): string | null => (key === 'memberId' ? 'pending-1' : null)
				})
			};

			const result: any = await actions.denyRequest({ params, locals, request } as any);

			expect(result.success).toBe(false);
			expect(result.message).toContain('leadership');
		});

		it('should handle database errors during deletion', async () => {
			const mockCurrentMembership = {
				id: 'member-1',
				role: 'organizer'
			};

			const mockPendingRequest = {
				id: 'pending-1',
				status: 'pending'
			};

			mockSupabase.from.mockImplementation((table: string) => {
				if (table === 'group_members') {
					let callCount = 0;
					return {
						select: vi.fn().mockReturnValue({
							eq: vi.fn().mockReturnValue({
								eq: vi.fn().mockReturnValue({
									eq: vi.fn().mockReturnValue({
										single: vi.fn().mockImplementation(() => {
											callCount++;
											if (callCount === 1) {
												return Promise.resolve({ data: mockCurrentMembership, error: null });
											}
											return Promise.resolve({ data: mockPendingRequest, error: null });
										})
									})
								})
							})
						}),
						delete: vi.fn().mockReturnValue({
							eq: vi.fn().mockReturnValue({
								eq: vi.fn().mockResolvedValue({ error: { message: 'Database error' } })
							})
						})
					};
				}
				return {};
			});

			const locals = { session: { user: { id: 'user-organizer' } } };
			const params = { id: 'group-1' };
			const request = {
				formData: async () => ({
					get: (key: string): string | null => (key === 'memberId' ? 'pending-1' : null)
				})
			};

			const result: any = await actions.denyRequest({ params, locals, request } as any);

			expect(result.success).toBe(false);
			expect(result.message).toContain('Failed to deny');
		});
	});
});
