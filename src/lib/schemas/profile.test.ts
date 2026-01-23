import { describe, it, expect } from 'vitest';
import { profileUpdateSchema, profileVisibilitySchema, type ProfileUpdateSchema } from './profile';

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
});

describe('profileUpdateSchema - displayName', () => {
	it('should accept valid display names', () => {
		const result = profileUpdateSchema.parse({
			displayName: 'John Doe',
			bio: '',
			location: ''
		});
		expect(result.displayName).toBe('John Doe');
	});

	it('should accept minimum length display names (2 chars)', () => {
		const result = profileUpdateSchema.parse({
			displayName: 'Jo',
			bio: '',
			location: ''
		});
		expect(result.displayName).toBe('Jo');
	});

	it('should accept maximum length display names (50 chars)', () => {
		const longName = 'a'.repeat(50);
		const result = profileUpdateSchema.parse({
			displayName: longName,
			bio: '',
			location: ''
		});
		expect(result.displayName).toBe(longName);
	});

	it('should reject display names that are too short', () => {
		expect(() =>
			profileUpdateSchema.parse({
				displayName: 'J',
				bio: '',
				location: ''
			})
		).toThrow('Display name must be at least 2 characters');
	});

	it('should reject display names that are too long', () => {
		const tooLong = 'a'.repeat(51);
		expect(() =>
			profileUpdateSchema.parse({
				displayName: tooLong,
				bio: '',
				location: ''
			})
		).toThrow('Display name must be at most 50 characters');
	});

	it('should reject empty display names', () => {
		expect(() =>
			profileUpdateSchema.parse({
				displayName: '',
				bio: '',
				location: ''
			})
		).toThrow();
	});

	it('should accept display names with whitespace (validation happens in server action)', () => {
		// Schema doesn't trim - that's handled by server action
		const result = profileUpdateSchema.parse({
			displayName: '   ',
			bio: '',
			location: ''
		});
		expect(result.displayName).toBe('   ');
	});
});

describe('profileUpdateSchema - bio', () => {
	it('should accept valid bios', () => {
		const result = profileUpdateSchema.parse({
			displayName: 'John Doe',
			bio: 'I love hiking and photography!',
			location: ''
		});
		expect(result.bio).toBe('I love hiking and photography!');
	});

	it('should accept empty bio', () => {
		const result = profileUpdateSchema.parse({
			displayName: 'John Doe',
			bio: '',
			location: ''
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
			location: ''
		});
		expect(result.bio).toBe('  This is my bio  ');
	});

	it('should accept maximum length bio (500 chars)', () => {
		const maxBio = 'a'.repeat(500);
		const result = profileUpdateSchema.parse({
			displayName: 'John Doe',
			bio: maxBio,
			location: ''
		});
		expect(result.bio).toBe(maxBio);
	});

	it('should reject bio that exceeds 500 characters', () => {
		const tooLong = 'a'.repeat(501);
		expect(() =>
			profileUpdateSchema.parse({
				displayName: 'John Doe',
				bio: tooLong,
				location: ''
			})
		).toThrow('Bio must be at most 500 characters');
	});

	it('should preserve line breaks in bio', () => {
		const bioWithBreaks = 'Line 1\nLine 2\nLine 3';
		const result = profileUpdateSchema.parse({
			displayName: 'John Doe',
			bio: bioWithBreaks,
			location: ''
		});
		expect(result.bio).toBe(bioWithBreaks);
	});
});

describe('profileUpdateSchema - location', () => {
	it('should accept valid location', () => {
		const result = profileUpdateSchema.parse({
			displayName: 'John Doe',
			bio: '',
			location: 'San Francisco, CA'
		});
		expect(result.location).toBe('San Francisco, CA');
	});

	it('should accept empty location', () => {
		const result = profileUpdateSchema.parse({
			displayName: 'John Doe',
			bio: '',
			location: ''
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
			location: '  New York, NY  '
		});
		expect(result.location).toBe('  New York, NY  ');
	});
});

describe('profileUpdateSchema - complete validation', () => {
	it('should accept all valid fields', () => {
		const validData: ProfileUpdateSchema = {
			displayName: 'Jane Smith',
			bio: 'Software engineer who loves coffee',
			location: 'Seattle, WA'
		};
		const result = profileUpdateSchema.parse(validData);
		expect(result).toEqual(validData);
	});

	it('should accept minimal valid data', () => {
		const minimalData = {
			displayName: 'Jo',
			bio: '',
			location: ''
		};
		const result = profileUpdateSchema.parse(minimalData);
		expect(result.displayName).toBe('Jo');
	});

	it('should handle missing optional fields', () => {
		const data = {
			displayName: 'John Doe'
		};
		const result = profileUpdateSchema.parse(data);
		expect(result.displayName).toBe('John Doe');
		expect(result.bio).toBeUndefined();
		expect(result.location).toBeUndefined();
	});
});

// TODO: Uncomment when profileVisibilityUpdateSchema is implemented in a future iteration
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
