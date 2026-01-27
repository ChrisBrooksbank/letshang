import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock SvelteKit modules
vi.mock('@sveltejs/kit', () => ({
	fail: vi.fn((status: number, data: unknown) => ({ status, data })),
	redirect: vi.fn((status: number, location: string) => {
		throw { status, location };
	})
}));

// Mock superforms
vi.mock('sveltekit-superforms', () => ({
	superValidate: vi.fn()
}));

// Mock zod adapter
vi.mock('sveltekit-superforms/adapters', () => ({
	zod: vi.fn((schema) => schema)
}));

// Mock geocoding utility
vi.mock('$lib/utils/geocoding', () => ({
	geocodeAddress: vi.fn()
}));

// Import after mocks are set up
import { load, actions } from './+page.server';
import { superValidate } from 'sveltekit-superforms';

describe('Profile Edit Page Server', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('load function', () => {
		it('should redirect to login if user is not authenticated', async () => {
			const mockSupabase = {
				auth: {
					getSession: vi.fn().mockResolvedValue({
						data: { session: null }
					})
				}
			};

			const mockLocals = {
				supabase: mockSupabase
			};

			await expect(
				load({
					locals: mockLocals
				} as never)
			).rejects.toMatchObject({
				status: 303,
				location: '/login'
			});
		});

		it('should load existing profile data', async () => {
			const mockProfile = {
				display_name: 'John Doe',
				bio: 'Software engineer',
				location: 'San Francisco, CA',
				profile_photo_url: 'https://example.com/photo.jpg',
				profile_visibility: 'public'
			};

			const mockSupabase = {
				auth: {
					getSession: vi.fn().mockResolvedValue({
						data: { session: { user: { id: 'user-123' } } }
					})
				},
				from: vi.fn().mockReturnValue({
					select: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							single: vi.fn().mockResolvedValue({
								data: mockProfile,
								error: null
							})
						})
					})
				})
			};

			const mockLocals = {
				supabase: mockSupabase
			};

			const mockForm = { data: {}, errors: {} };
			vi.mocked(superValidate).mockResolvedValue(mockForm as never);

			const result = await load({ locals: mockLocals } as never);

			expect(mockSupabase.from).toHaveBeenCalledWith('users');
			expect(result).toHaveProperty('form');
		});

		it('should initialize empty form if profile does not exist', async () => {
			const mockSupabase = {
				auth: {
					getSession: vi.fn().mockResolvedValue({
						data: { session: { user: { id: 'user-123' } } }
					})
				},
				from: vi.fn().mockReturnValue({
					select: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							single: vi.fn().mockResolvedValue({
								data: null,
								error: { message: 'Not found' }
							})
						})
					})
				})
			};

			const mockLocals = {
				supabase: mockSupabase
			};

			const mockForm = { data: {}, errors: {} };
			vi.mocked(superValidate).mockResolvedValue(mockForm as never);

			const result = await load({ locals: mockLocals } as never);

			expect(result).toHaveProperty('form');
		});
	});

	describe('default action', () => {
		it('should redirect to login if user is not authenticated', async () => {
			const mockSupabase = {
				auth: {
					getSession: vi.fn().mockResolvedValue({
						data: { session: null }
					})
				}
			};

			const mockLocals = {
				supabase: mockSupabase
			};

			const mockRequest = new Request('http://localhost', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					displayName: 'John Doe',
					bio: 'Test bio',
					location: 'Test location'
				})
			});

			await expect(
				actions.default({
					request: mockRequest,
					locals: mockLocals
				} as never)
			).rejects.toMatchObject({
				status: 303,
				location: '/login'
			});
		});

		it('should return validation error for invalid data', async () => {
			const mockSupabase = {
				auth: {
					getSession: vi.fn().mockResolvedValue({
						data: { session: { user: { id: 'user-123' } } }
					})
				}
			};

			const mockLocals = {
				supabase: mockSupabase
			};

			vi.mocked(superValidate).mockResolvedValue({
				valid: false,
				errors: { displayName: ['Display name must be at least 2 characters'] }
			} as never);

			const mockRequest = new Request('http://localhost', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					displayName: 'J',
					bio: '',
					location: ''
				})
			});

			const result = await actions.default({ request: mockRequest, locals: mockLocals } as never);

			expect(result).toHaveProperty('status', 400);
		});

		it('should update profile successfully', async () => {
			const mockSupabase = {
				auth: {
					getSession: vi.fn().mockResolvedValue({
						data: { session: { user: { id: 'user-123' } } }
					})
				},
				from: vi.fn().mockReturnValue({
					update: vi.fn().mockReturnValue({
						eq: vi.fn().mockResolvedValue({
							error: null
						})
					})
				})
			};

			const mockLocals = {
				supabase: mockSupabase
			};

			vi.mocked(superValidate).mockResolvedValue({
				valid: true,
				data: {
					displayName: 'John Doe',
					bio: 'Software engineer',
					location: 'San Francisco, CA',
					profilePhotoUrl: 'https://example.com/photo.jpg',
					profileVisibility: 'public'
				}
			} as never);

			const mockRequest = new Request('http://localhost', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					displayName: 'John Doe',
					bio: 'Software engineer',
					location: 'San Francisco, CA'
				})
			});

			await expect(
				actions.default({ request: mockRequest, locals: mockLocals } as never)
			).rejects.toMatchObject({
				status: 303,
				location: '/profile'
			});

			expect(mockSupabase.from).toHaveBeenCalledWith('users');
		});

		it('should handle empty optional fields', async () => {
			const mockUpdate = vi.fn().mockReturnValue({
				eq: vi.fn().mockResolvedValue({
					error: null
				})
			});

			const mockSupabase = {
				auth: {
					getSession: vi.fn().mockResolvedValue({
						data: { session: { user: { id: 'user-123' } } }
					})
				},
				from: vi.fn().mockReturnValue({
					update: mockUpdate
				})
			};

			const mockLocals = {
				supabase: mockSupabase
			};

			vi.mocked(superValidate).mockResolvedValue({
				valid: true,
				data: {
					displayName: 'John Doe',
					bio: '',
					location: '',
					profilePhotoUrl: '',
					profileVisibility: 'members_only'
				}
			} as never);

			const mockRequest = new Request('http://localhost', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					displayName: 'John Doe',
					bio: '',
					location: ''
				})
			});

			await expect(
				actions.default({ request: mockRequest, locals: mockLocals } as never)
			).rejects.toMatchObject({
				status: 303,
				location: '/profile'
			});

			expect(mockUpdate).toHaveBeenCalledWith({
				display_name: 'John Doe',
				bio: null,
				location: null,
				location_lat: null,
				location_lng: null,
				profile_photo_url: null,
				profile_visibility: 'members_only'
			});
		});

		it('should return error on database failure', async () => {
			const mockSupabase = {
				auth: {
					getSession: vi.fn().mockResolvedValue({
						data: { session: { user: { id: 'user-123' } } }
					})
				},
				from: vi.fn().mockReturnValue({
					update: vi.fn().mockReturnValue({
						eq: vi.fn().mockResolvedValue({
							error: { message: 'Database error' }
						})
					})
				})
			};

			const mockLocals = {
				supabase: mockSupabase
			};

			vi.mocked(superValidate).mockResolvedValue({
				valid: true,
				data: {
					displayName: 'John Doe',
					bio: 'Test bio',
					location: 'Test location',
					profilePhotoUrl: '',
					profileVisibility: 'members_only'
				}
			} as never);

			const mockRequest = new Request('http://localhost', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					displayName: 'John Doe',
					bio: 'Test bio',
					location: 'Test location'
				})
			});

			const result = await actions.default({ request: mockRequest, locals: mockLocals } as never);

			expect(result).toHaveProperty('status', 500);
		});

		it('should trim whitespace from displayName', async () => {
			const mockUpdate = vi.fn().mockReturnValue({
				eq: vi.fn().mockResolvedValue({
					error: null
				})
			});

			const mockSupabase = {
				auth: {
					getSession: vi.fn().mockResolvedValue({
						data: { session: { user: { id: 'user-123' } } }
					})
				},
				from: vi.fn().mockReturnValue({
					update: mockUpdate
				})
			};

			const mockLocals = {
				supabase: mockSupabase
			};

			vi.mocked(superValidate).mockResolvedValue({
				valid: true,
				data: {
					displayName: 'John Doe',
					bio: '',
					location: '',
					profilePhotoUrl: '',
					profileVisibility: 'members_only'
				}
			} as never);

			const mockRequest = new Request('http://localhost', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					displayName: '  John Doe  ',
					bio: '',
					location: ''
				})
			});

			await expect(
				actions.default({ request: mockRequest, locals: mockLocals } as never)
			).rejects.toMatchObject({
				status: 303,
				location: '/profile'
			});

			expect(mockUpdate).toHaveBeenCalledWith({
				display_name: 'John Doe',
				bio: null,
				location: null,
				location_lat: null,
				location_lng: null,
				profile_photo_url: null,
				profile_visibility: 'members_only'
			});
		});

		it('should update profile visibility setting', async () => {
			const mockUpdate = vi.fn().mockReturnValue({
				eq: vi.fn().mockResolvedValue({
					error: null
				})
			});

			const mockSupabase = {
				auth: {
					getSession: vi.fn().mockResolvedValue({
						data: { session: { user: { id: 'user-123' } } }
					})
				},
				from: vi.fn().mockReturnValue({
					update: mockUpdate
				})
			};

			const mockLocals = {
				supabase: mockSupabase
			};

			vi.mocked(superValidate).mockResolvedValue({
				valid: true,
				data: {
					displayName: 'John Doe',
					bio: '',
					location: '',
					profilePhotoUrl: '',
					profileVisibility: 'public'
				}
			} as never);

			const mockRequest = new Request('http://localhost', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					displayName: 'John Doe',
					bio: '',
					location: '',
					profileVisibility: 'public'
				})
			});

			await expect(
				actions.default({ request: mockRequest, locals: mockLocals } as never)
			).rejects.toMatchObject({
				status: 303,
				location: '/profile'
			});

			expect(mockUpdate).toHaveBeenCalledWith({
				display_name: 'John Doe',
				bio: null,
				location: null,
				location_lat: null,
				location_lng: null,
				profile_photo_url: null,
				profile_visibility: 'public'
			});
		});

		it('should accept connections_only visibility', async () => {
			const mockUpdate = vi.fn().mockReturnValue({
				eq: vi.fn().mockResolvedValue({
					error: null
				})
			});

			const mockSupabase = {
				auth: {
					getSession: vi.fn().mockResolvedValue({
						data: { session: { user: { id: 'user-123' } } }
					})
				},
				from: vi.fn().mockReturnValue({
					update: mockUpdate
				})
			};

			const mockLocals = {
				supabase: mockSupabase
			};

			vi.mocked(superValidate).mockResolvedValue({
				valid: true,
				data: {
					displayName: 'John Doe',
					bio: '',
					location: '',
					profilePhotoUrl: '',
					profileVisibility: 'connections_only'
				}
			} as never);

			const mockRequest = new Request('http://localhost', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					displayName: 'John Doe',
					profileVisibility: 'connections_only'
				})
			});

			await expect(
				actions.default({ request: mockRequest, locals: mockLocals } as never)
			).rejects.toMatchObject({
				status: 303,
				location: '/profile'
			});

			expect(mockUpdate).toHaveBeenCalledWith({
				display_name: 'John Doe',
				bio: null,
				location: null,
				location_lat: null,
				location_lng: null,
				profile_photo_url: null,
				profile_visibility: 'connections_only'
			});
		});
	});
});
