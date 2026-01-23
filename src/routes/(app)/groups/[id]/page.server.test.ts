import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Supabase client - must be declared before imports
vi.mock('$lib/server/supabase', () => ({
	supabase: {
		from: vi.fn()
	}
}));

import { load, actions } from './+page.server';
import { supabase } from '$lib/server/supabase';

// Cast to mock type for test usage

const mockSupabase = supabase as any;

// Test UUIDs
const TEST_GROUP_ID = '550e8400-e29b-41d4-a716-446655440000';
const TEST_USER_ID_2 = '550e8400-e29b-41d4-a716-446655440002';
const TEST_ORGANIZER_ID = '550e8400-e29b-41d4-a716-446655440003';

describe('Group Detail Page Server', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('load function', () => {
		it('should fetch and return group data with all related information', async () => {
			const mockGroup = {
				id: TEST_GROUP_ID,
				name: 'Test Group',
				description: 'Test description',
				cover_image_url: 'https://example.com/cover.jpg',
				group_type: 'public',
				location: 'San Francisco, CA',
				organizer_id: TEST_ORGANIZER_ID,
				organizer: {
					id: TEST_ORGANIZER_ID,
					display_name: 'Test Organizer',
					avatar_url: 'https://example.com/avatar.jpg'
				},
				created_at: '2024-01-01T00:00:00Z',
				updated_at: '2024-01-01T00:00:00Z'
			};

			const mockTopics = [
				{ topics: { id: 'topic-1', name: 'JavaScript', category: 'Tech' } },
				{ topics: { id: 'topic-2', name: 'Hiking', category: 'Sports' } }
			];

			mockSupabase.from.mockImplementation((table: string) => {
				if (table === 'groups') {
					return {
						select: vi.fn().mockReturnValue({
							eq: vi.fn().mockReturnValue({
								single: vi.fn().mockResolvedValue({ data: mockGroup, error: null })
							})
						})
					};
				}
				if (table === 'group_topics') {
					return {
						select: vi.fn().mockReturnValue({
							eq: vi.fn().mockResolvedValue({ data: mockTopics, error: null })
						})
					};
				}
				if (table === 'group_members') {
					return {
						select: vi.fn().mockReturnValue({
							eq: vi.fn().mockReturnValue({
								eq: vi.fn().mockReturnValue({
									single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } })
								}),
								head: true,
								count: 'exact'
							})
						})
					};
				}
				if (table === 'events') {
					return {
						select: vi.fn().mockReturnValue({
							eq: vi.fn().mockReturnValue({
								gte: vi.fn().mockResolvedValue({ count: 3, error: null })
							})
						})
					};
				}
				return {};
			});

			const locals = { session: { user: { id: TEST_USER_ID_2 } } };
			const params = { id: TEST_GROUP_ID };

			const result: any = await load({ params, locals } as any);

			expect(result).toMatchObject({
				group: mockGroup,
				topics: [
					{ id: 'topic-1', name: 'JavaScript', category: 'Tech' },
					{ id: 'topic-2', name: 'Hiking', category: 'Sports' }
				],
				memberCount: 0,
				upcomingEventsCount: 3,
				userMembership: null,
				hasPendingRequest: false,
				isAuthenticated: true
			});
		});

		it('should throw 400 error when group ID is missing', async () => {
			const locals = { session: null };
			const params = { id: '' };

			await expect(load({ params, locals } as any)).rejects.toThrow();
		});

		it('should throw 404 error when group is not found', async () => {
			mockSupabase.from.mockReturnValue({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } })
					})
				})
			});

			const locals = { session: null };
			const params = { id: 'non-existent' };

			await expect(load({ params, locals } as any)).rejects.toThrow();
		});

		it('should detect user membership when user is a member', async () => {
			const mockGroup = {
				id: TEST_GROUP_ID,
				name: 'Test Group',
				group_type: 'public',
				organizer: { id: TEST_ORGANIZER_ID, display_name: 'Organizer' }
			};

			const mockMembership = {
				id: 'member-1',
				group_id: TEST_GROUP_ID,
				user_id: TEST_USER_ID_2,
				role: 'member',
				status: 'active'
			};

			let callCount = 0;
			mockSupabase.from.mockImplementation((table: string) => {
				if (table === 'groups') {
					return {
						select: vi.fn().mockReturnValue({
							eq: vi.fn().mockReturnValue({
								single: vi.fn().mockResolvedValue({ data: mockGroup, error: null })
							})
						})
					};
				}
				if (table === 'group_topics') {
					return {
						select: vi.fn().mockReturnValue({
							eq: vi.fn().mockResolvedValue({ data: [], error: null })
						})
					};
				}
				if (table === 'group_members') {
					callCount++;
					if (callCount === 1) {
						// First call for member count
						return {
							select: vi.fn().mockReturnValue({
								eq: vi.fn().mockReturnValue({
									eq: vi.fn().mockResolvedValue({ count: 5, error: null })
								})
							})
						};
					} else {
						// Second call for user membership
						return {
							select: vi.fn().mockReturnValue({
								eq: vi.fn().mockReturnValue({
									eq: vi.fn().mockReturnValue({
										single: vi.fn().mockResolvedValue({ data: mockMembership, error: null })
									})
								})
							})
						};
					}
				}
				if (table === 'events') {
					return {
						select: vi.fn().mockReturnValue({
							eq: vi.fn().mockReturnValue({
								gte: vi.fn().mockResolvedValue({ count: 0, error: null })
							})
						})
					};
				}
				return {};
			});

			const locals = { session: { user: { id: TEST_USER_ID_2 } } };
			const params = { id: TEST_GROUP_ID };

			const result: any = await load({ params, locals } as any);

			expect(result.userMembership).toEqual(mockMembership);
			expect(result.isAuthenticated).toBe(true);
		});

		it('should work for unauthenticated users', async () => {
			const mockGroup = {
				id: TEST_GROUP_ID,
				name: 'Public Group',
				group_type: 'public',
				organizer: { id: TEST_ORGANIZER_ID, display_name: 'Organizer' }
			};

			mockSupabase.from.mockImplementation((table: string) => {
				if (table === 'groups') {
					return {
						select: vi.fn().mockReturnValue({
							eq: vi.fn().mockReturnValue({
								single: vi.fn().mockResolvedValue({ data: mockGroup, error: null })
							})
						})
					};
				}
				if (table === 'group_topics') {
					return {
						select: vi.fn().mockReturnValue({
							eq: vi.fn().mockResolvedValue({ data: [], error: null })
						})
					};
				}
				if (table === 'group_members') {
					return {
						select: vi.fn().mockReturnValue({
							eq: vi.fn().mockReturnValue({
								eq: vi.fn().mockResolvedValue({ count: 10, error: null })
							})
						})
					};
				}
				if (table === 'events') {
					return {
						select: vi.fn().mockReturnValue({
							eq: vi.fn().mockReturnValue({
								gte: vi.fn().mockResolvedValue({ count: 2, error: null })
							})
						})
					};
				}
				return {};
			});

			const locals = { session: null };
			const params = { id: TEST_GROUP_ID };

			const result: any = await load({ params, locals } as any);

			expect(result.isAuthenticated).toBe(false);
			expect(result.userMembership).toBe(null);
		});
	});

	describe('actions.join', () => {
		it('should allow user to join a public group immediately', async () => {
			const mockGroup = {
				id: TEST_GROUP_ID,
				group_type: 'public'
			};

			mockSupabase.from.mockImplementation((table: string) => {
				if (table === 'groups') {
					return {
						select: vi.fn().mockReturnValue({
							eq: vi.fn().mockReturnValue({
								single: vi.fn().mockResolvedValue({ data: mockGroup, error: null })
							})
						})
					};
				}
				if (table === 'group_members') {
					return {
						insert: vi.fn().mockResolvedValue({ error: null })
					};
				}
				return {};
			});

			const locals = { session: { user: { id: TEST_USER_ID_2 } } };
			const params = { id: TEST_GROUP_ID };
			const formData = new FormData();
			const request = {
				formData: async () => formData
			};

			const result: any = await actions.join({ params, locals, request } as any);

			expect(result.success).toBe(true);
			expect(result.message).toContain('Successfully joined');
		});

		it('should create pending request for private group', async () => {
			const mockGroup = {
				id: TEST_GROUP_ID,
				group_type: 'private'
			};

			let insertedData: any = null;

			mockSupabase.from.mockImplementation((table: string) => {
				if (table === 'groups') {
					return {
						select: vi.fn().mockReturnValue({
							eq: vi.fn().mockReturnValue({
								single: vi.fn().mockResolvedValue({ data: mockGroup, error: null })
							})
						})
					};
				}
				if (table === 'group_members') {
					return {
						insert: vi.fn().mockImplementation((data) => {
							insertedData = data;
							return Promise.resolve({ error: null });
						})
					};
				}
				return {};
			});

			const locals = { session: { user: { id: TEST_USER_ID_2 } } };
			const params = { id: TEST_GROUP_ID };
			const formData = new FormData();
			formData.append('message', '');
			const request = {
				formData: async () => formData
			};

			const result: any = await actions.join({ params, locals, request } as any);

			expect(result.success).toBe(true);
			expect(result.message).toContain('Join request sent');
			expect(insertedData?.status).toBe('pending');
		});

		it('should include message when joining private group', async () => {
			const mockGroup = {
				id: TEST_GROUP_ID,
				group_type: 'private'
			};

			let insertedData: any = null;

			mockSupabase.from.mockImplementation((table: string) => {
				if (table === 'groups') {
					return {
						select: vi.fn().mockReturnValue({
							eq: vi.fn().mockReturnValue({
								single: vi.fn().mockResolvedValue({ data: mockGroup, error: null })
							})
						})
					};
				}
				if (table === 'group_members') {
					return {
						insert: vi.fn().mockImplementation((data) => {
							insertedData = data;
							return Promise.resolve({ error: null });
						})
					};
				}
				return {};
			});

			const locals = { session: { user: { id: TEST_USER_ID_2 } } };
			const params = { id: TEST_GROUP_ID };
			const formData = new FormData();
			formData.append('message', 'I am really interested in joining this group!');
			const request = {
				formData: async () => formData
			};

			const result: any = await actions.join({ params, locals, request } as any);

			expect(result.success).toBe(true);
			expect(insertedData?.status).toBe('pending');
			expect(insertedData?.join_request_message).toBe(
				'I am really interested in joining this group!'
			);
		});

		it('should not include message for public groups', async () => {
			const mockGroup = {
				id: TEST_GROUP_ID,
				group_type: 'public'
			};

			let insertedData: any = null;

			mockSupabase.from.mockImplementation((table: string) => {
				if (table === 'groups') {
					return {
						select: vi.fn().mockReturnValue({
							eq: vi.fn().mockReturnValue({
								single: vi.fn().mockResolvedValue({ data: mockGroup, error: null })
							})
						})
					};
				}
				if (table === 'group_members') {
					return {
						insert: vi.fn().mockImplementation((data) => {
							insertedData = data;
							return Promise.resolve({ error: null });
						})
					};
				}
				return {};
			});

			const locals = { session: { user: { id: TEST_USER_ID_2 } } };
			const params = { id: TEST_GROUP_ID };
			const formData = new FormData();
			formData.append('message', 'I want to join but this is a public group');
			const request = {
				formData: async () => formData
			};

			const result: any = await actions.join({ params, locals, request } as any);

			expect(result.success).toBe(true);
			expect(insertedData?.status).toBe('active');
			expect(insertedData?.join_request_message).toBe(null);
		});

		it('should reject message longer than 500 characters', async () => {
			const longMessage = 'a'.repeat(501);

			const locals = { session: { user: { id: TEST_USER_ID_2 } } };
			const params = { id: TEST_GROUP_ID };
			const formData = new FormData();
			formData.append('message', longMessage);
			const request = {
				formData: async () => formData
			};

			const result: any = await actions.join({ params, locals, request } as any);

			expect(result.status).toBe(400);
			expect(result.data.success).toBe(false);
			expect(result.data.message).toContain('500 characters');
		});

		it('should redirect to login if user is not authenticated', async () => {
			const locals = { session: null };
			const params = { id: TEST_GROUP_ID };
			const formData = new FormData();
			const request = {
				formData: async () => formData
			};

			await expect(actions.join({ params, locals, request } as any)).rejects.toThrow();
		});

		it('should handle duplicate membership gracefully', async () => {
			const mockGroup = {
				id: TEST_GROUP_ID,
				group_type: 'public'
			};

			mockSupabase.from.mockImplementation((table: string) => {
				if (table === 'groups') {
					return {
						select: vi.fn().mockReturnValue({
							eq: vi.fn().mockReturnValue({
								single: vi.fn().mockResolvedValue({ data: mockGroup, error: null })
							})
						})
					};
				}
				if (table === 'group_members') {
					return {
						insert: vi.fn().mockResolvedValue({ error: { code: '23505', message: 'Duplicate' } })
					};
				}
				return {};
			});

			const locals = { session: { user: { id: TEST_USER_ID_2 } } };
			const params = { id: TEST_GROUP_ID };
			const formData = new FormData();
			const request = {
				formData: async () => formData
			};

			const result: any = await actions.join({ params, locals, request } as any);

			expect(result.status).toBe(409);
			expect(result.data.success).toBe(false);
			expect(result.data.message).toContain('already a member');
		});

		it('should return error when group is not found', async () => {
			mockSupabase.from.mockReturnValue({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } })
					})
				})
			});

			const locals = { session: { user: { id: TEST_USER_ID_2 } } };
			const params = { id: '550e8400-e29b-41d4-a716-999999999999' };
			const formData = new FormData();
			const request = {
				formData: async () => formData
			};

			const result: any = await actions.join({ params, locals, request } as any);

			expect(result.status).toBe(404);
			expect(result.data.success).toBe(false);
			expect(result.data.message).toContain('Group not found');
		});

		it('should handle database errors during insert', async () => {
			const mockGroup = {
				id: TEST_GROUP_ID,
				group_type: 'public'
			};

			mockSupabase.from.mockImplementation((table: string) => {
				if (table === 'groups') {
					return {
						select: vi.fn().mockReturnValue({
							eq: vi.fn().mockReturnValue({
								single: vi.fn().mockResolvedValue({ data: mockGroup, error: null })
							})
						})
					};
				}
				if (table === 'group_members') {
					return {
						insert: vi.fn().mockResolvedValue({ error: { message: 'Database error' } })
					};
				}
				return {};
			});

			const locals = { session: { user: { id: TEST_USER_ID_2 } } };
			const params = { id: TEST_GROUP_ID };
			const formData = new FormData();
			const request = {
				formData: async () => formData
			};

			const result: any = await actions.join({ params, locals, request } as any);

			expect(result.status).toBe(500);
			expect(result.data.success).toBe(false);
			expect(result.data.message).toContain('Failed to join group');
		});
	});
});
