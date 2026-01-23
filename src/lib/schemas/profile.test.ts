import { describe, it, expect } from 'vitest';
import {
	profileUpdateSchema,
	profileVisibilitySchema,
	type ProfileUpdateSchema,
	type ProfileVisibility
} from './profile';

describe('profileVisibilitySchema', () => {
	it('should accept valid visibility options', () => {
		expect(profileVisibilitySchema.parse('public')).toBe('public');
		expect(profileVisibilitySchema.parse('members_only')).toBe('members_only');
		expect(profileVisibilitySchema.parse('connections_only')).toBe('connections_only');
	});

	it('should reject invalid visibility options', () => {
		expect(() => profileVisibilitySchema.parse('invalid')).toThrow();
		expect(() => profileVisibilitySchema.parse('')).toThrow();
		expect(() => profileVisibilitySchema.parse(null)).toThrow();
	});

	it('should have correct TypeScript type', () => {
		// This test verifies the ProfileVisibility type is correctly inferred
		const validOptions: ProfileVisibility[] = ['public', 'members_only', 'connections_only'];
		validOptions.forEach((option) => {
			expect(profileVisibilitySchema.parse(option)).toBe(option);
		});
	});
});

describe('profileUpdateSchema - displayName', () => {
	it('should accept valid display names', () => {
		const result = profileUpdateSchema.parse({
			displayName: 'John Doe',
			bio: '',
			location: '',
			profilePhotoUrl: '',
			profileVisibility: 'members_only'
		});
		expect(result.displayName).toBe('John Doe');
	});

	it('should accept minimum length display names (2 chars)', () => {
		const result = profileUpdateSchema.parse({
			displayName: 'Jo',
			bio: '',
			location: '',
			profilePhotoUrl: '',
			profileVisibility: 'members_only'
		});
		expect(result.displayName).toBe('Jo');
	});

	it('should accept maximum length display names (50 chars)', () => {
		const longName = 'a'.repeat(50);
		const result = profileUpdateSchema.parse({
			displayName: longName,
			bio: '',
			location: '',
			profilePhotoUrl: '',
			profileVisibility: 'members_only'
		});
		expect(result.displayName).toBe(longName);
	});

	it('should reject display names that are too short', () => {
		expect(() =>
			profileUpdateSchema.parse({
				displayName: 'J',
				bio: '',
				location: '',
				profilePhotoUrl: '',
				profileVisibility: 'members_only'
			})
		).toThrow('Display name must be at least 2 characters');
	});

	it('should reject display names that are too long', () => {
		const tooLong = 'a'.repeat(51);
		expect(() =>
			profileUpdateSchema.parse({
				displayName: tooLong,
				bio: '',
				location: '',
				profilePhotoUrl: '',
				profileVisibility: 'members_only'
			})
		).toThrow('Display name must be at most 50 characters');
	});

	it('should reject empty display names', () => {
		expect(() =>
			profileUpdateSchema.parse({
				displayName: '',
				bio: '',
				location: '',
				profilePhotoUrl: '',
				profileVisibility: 'members_only'
			})
		).toThrow();
	});

	it('should accept display names with whitespace (validation happens in server action)', () => {
		// Schema doesn't trim - that's handled by server action
		const result = profileUpdateSchema.parse({
			displayName: '   ',
			bio: '',
			location: '',
			profilePhotoUrl: '',
			profileVisibility: 'members_only'
		});
		expect(result.displayName).toBe('   ');
	});
});

describe('profileUpdateSchema - bio', () => {
	it('should accept valid bios', () => {
		const result = profileUpdateSchema.parse({
			displayName: 'John Doe',
			bio: 'I love hiking and photography!',
			location: '',
			profilePhotoUrl: '',
			profileVisibility: 'members_only'
		});
		expect(result.bio).toBe('I love hiking and photography!');
	});

	it('should accept empty bio', () => {
		const result = profileUpdateSchema.parse({
			displayName: 'John Doe',
			bio: '',
			location: '',
			profilePhotoUrl: '',
			profileVisibility: 'members_only'
		});
		expect(result.bio).toBe('');
	});

	it('should accept undefined bio', () => {
		const result = profileUpdateSchema.parse({
			displayName: 'John Doe'
		});
		expect(result.bio).toBeUndefined();
	});

	it('should accept bio with whitespace (trimming happens in server action)', () => {
		const result = profileUpdateSchema.parse({
			displayName: 'John Doe',
			bio: '  This is my bio  ',
			location: '',
			profilePhotoUrl: '',
			profileVisibility: 'members_only'
		});
		expect(result.bio).toBe('  This is my bio  ');
	});

	it('should accept maximum length bio (500 chars)', () => {
		const maxBio = 'a'.repeat(500);
		const result = profileUpdateSchema.parse({
			displayName: 'John Doe',
			bio: maxBio,
			location: '',
			profilePhotoUrl: '',
			profileVisibility: 'members_only'
		});
		expect(result.bio).toBe(maxBio);
	});

	it('should reject bio that exceeds 500 characters', () => {
		const tooLong = 'a'.repeat(501);
		expect(() =>
			profileUpdateSchema.parse({
				displayName: 'John Doe',
				bio: tooLong,
				location: '',
				profilePhotoUrl: '',
				profileVisibility: 'members_only'
			})
		).toThrow('Bio must be at most 500 characters');
	});

	it('should preserve line breaks in bio', () => {
		const bioWithBreaks = 'Line 1\nLine 2\nLine 3';
		const result = profileUpdateSchema.parse({
			displayName: 'John Doe',
			bio: bioWithBreaks,
			location: '',
			profilePhotoUrl: '',
			profileVisibility: 'members_only'
		});
		expect(result.bio).toBe(bioWithBreaks);
	});
});

describe('profileUpdateSchema - location', () => {
	it('should accept valid location', () => {
		const result = profileUpdateSchema.parse({
			displayName: 'John Doe',
			bio: '',
			location: 'San Francisco, CA',
			profilePhotoUrl: '',
			profileVisibility: 'members_only'
		});
		expect(result.location).toBe('San Francisco, CA');
	});

	it('should accept empty location', () => {
		const result = profileUpdateSchema.parse({
			displayName: 'John Doe',
			bio: '',
			location: '',
			profilePhotoUrl: '',
			profileVisibility: 'members_only'
		});
		expect(result.location).toBe('');
	});

	it('should accept undefined location', () => {
		const result = profileUpdateSchema.parse({
			displayName: 'John Doe'
		});
		expect(result.location).toBeUndefined();
	});

	it('should accept location with whitespace (trimming happens in server action)', () => {
		const result = profileUpdateSchema.parse({
			displayName: 'John Doe',
			bio: '',
			location: '  New York, NY  ',
			profilePhotoUrl: '',
			profileVisibility: 'members_only'
		});
		expect(result.location).toBe('  New York, NY  ');
	});
});

describe('profileUpdateSchema - profilePhotoUrl', () => {
	it('should accept valid URL', () => {
		const result = profileUpdateSchema.parse({
			displayName: 'John Doe',
			profilePhotoUrl: 'https://example.com/photo.jpg'
		});
		expect(result.profilePhotoUrl).toBe('https://example.com/photo.jpg');
	});

	it('should accept empty string', () => {
		const result = profileUpdateSchema.parse({
			displayName: 'John Doe',
			profilePhotoUrl: ''
		});
		expect(result.profilePhotoUrl).toBe('');
	});

	it('should accept data URL', () => {
		const dataUrl =
			'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
		const result = profileUpdateSchema.parse({
			displayName: 'John Doe',
			profilePhotoUrl: dataUrl
		});
		expect(result.profilePhotoUrl).toBe(dataUrl);
	});

	it('should accept undefined profilePhotoUrl', () => {
		const result = profileUpdateSchema.parse({
			displayName: 'John Doe'
		});
		expect(result.profilePhotoUrl).toBeUndefined();
	});

	it('should reject invalid URL (not empty or valid URL)', () => {
		expect(() =>
			profileUpdateSchema.parse({
				displayName: 'John Doe',
				profilePhotoUrl: 'not a url'
			})
		).toThrow();
	});
});

describe('profileUpdateSchema - profileVisibility', () => {
	it('should accept all valid visibility options', () => {
		const result1 = profileUpdateSchema.parse({
			displayName: 'John Doe',
			profileVisibility: 'public'
		});
		expect(result1.profileVisibility).toBe('public');

		const result2 = profileUpdateSchema.parse({
			displayName: 'John Doe',
			profileVisibility: 'members_only'
		});
		expect(result2.profileVisibility).toBe('members_only');

		const result3 = profileUpdateSchema.parse({
			displayName: 'John Doe',
			profileVisibility: 'connections_only'
		});
		expect(result3.profileVisibility).toBe('connections_only');
	});

	it('should default to members_only when not specified', () => {
		const result = profileUpdateSchema.parse({
			displayName: 'John Doe'
		});
		expect(result.profileVisibility).toBe('members_only');
	});

	it('should reject invalid visibility values', () => {
		expect(() =>
			profileUpdateSchema.parse({
				displayName: 'John Doe',
				profileVisibility: 'invalid'
			})
		).toThrow();
	});
});

describe('profileUpdateSchema - complete validation', () => {
	it('should accept all valid fields', () => {
		const validData: ProfileUpdateSchema = {
			displayName: 'Jane Smith',
			bio: 'Software engineer who loves coffee',
			location: 'Seattle, WA',
			profilePhotoUrl: 'https://example.com/photo.jpg',
			profileVisibility: 'public'
		};
		const result = profileUpdateSchema.parse(validData);
		expect(result).toEqual(validData);
	});

	it('should accept minimal valid data', () => {
		const minimalData = {
			displayName: 'Jo',
			bio: '',
			location: '',
			profilePhotoUrl: '',
			profileVisibility: 'members_only' as const
		};
		const result = profileUpdateSchema.parse(minimalData);
		expect(result.displayName).toBe('Jo');
		expect(result.profileVisibility).toBe('members_only');
	});

	it('should handle missing optional fields and default profileVisibility', () => {
		const data = {
			displayName: 'John Doe'
		};
		const result = profileUpdateSchema.parse(data);
		expect(result.displayName).toBe('John Doe');
		expect(result.bio).toBeUndefined();
		expect(result.location).toBeUndefined();
		expect(result.profilePhotoUrl).toBeUndefined();
		expect(result.profileVisibility).toBe('members_only');
	});
});

// Tests for profileVisibilityUpdateSchema - currently commented out as schema is unused
// Uncomment when we implement a dedicated visibility-only update endpoint
// describe('profileVisibilityUpdateSchema', () => {
// 	it('should accept valid visibility update', () => {
// 		const result = profileVisibilityUpdateSchema.parse({
// 			profileVisibility: 'public'
// 		});
// 		expect(result.profileVisibility).toBe('public');
// 	});

// 	it('should accept all visibility options', () => {
// 		const visibilities: ProfileVisibility[] = ['public', 'members_only', 'connections_only'];

// 		visibilities.forEach((visibility) => {
// 			const result = profileVisibilityUpdateSchema.parse({
// 				profileVisibility: visibility
// 			});
// 			expect(result.profileVisibility).toBe(visibility);
// 		});
// 	});

// 	it('should reject invalid visibility', () => {
// 		expect(() =>
// 			profileVisibilityUpdateSchema.parse({
// 				profileVisibility: 'invalid'
// 			})
// 		).toThrow();
// 	});

// 	it('should reject missing visibility', () => {
// 		expect(() => profileVisibilityUpdateSchema.parse({})).toThrow();
// 	});
// });
