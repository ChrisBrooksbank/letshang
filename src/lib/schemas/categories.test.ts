import { describe, it, expect } from 'vitest';
import {
	categoryEnum,
	categoryNames,
	CATEGORY_METADATA,
	getCategoryBySlug,
	getAllCategorySlugs
} from './categories';

describe('Category Schema', () => {
	describe('categoryEnum', () => {
		it('should accept valid category names', () => {
			expect(() => categoryEnum.parse('Tech')).not.toThrow();
			expect(() => categoryEnum.parse('Sports')).not.toThrow();
			expect(() => categoryEnum.parse('Arts')).not.toThrow();
			expect(() => categoryEnum.parse('Social')).not.toThrow();
			expect(() => categoryEnum.parse('Career')).not.toThrow();
		});

		it('should reject invalid category names', () => {
			expect(() => categoryEnum.parse('InvalidCategory')).toThrow();
			expect(() => categoryEnum.parse('')).toThrow();
			expect(() => categoryEnum.parse('tech')).toThrow(); // lowercase
		});

		it('should have exactly 5 categories', () => {
			expect(categoryNames).toHaveLength(5);
		});
	});

	describe('CATEGORY_METADATA', () => {
		it('should have metadata for all categories', () => {
			for (const categoryName of categoryNames) {
				expect(CATEGORY_METADATA[categoryName]).toBeDefined();
			}
		});

		it('should have required fields for each category', () => {
			for (const categoryName of categoryNames) {
				const metadata = CATEGORY_METADATA[categoryName];
				expect(metadata.name).toBe(categoryName);
				expect(metadata.slug).toBeTruthy();
				expect(metadata.description).toBeTruthy();
				expect(metadata.icon).toBeTruthy();
			}
		});

		it('should have unique slugs', () => {
			const slugs = Object.values(CATEGORY_METADATA).map((cat) => cat.slug);
			const uniqueSlugs = new Set(slugs);
			expect(uniqueSlugs.size).toBe(slugs.length);
		});

		it('should have lowercase slugs', () => {
			for (const metadata of Object.values(CATEGORY_METADATA)) {
				expect(metadata.slug).toBe(metadata.slug.toLowerCase());
			}
		});

		it('should have emoji icons', () => {
			for (const metadata of Object.values(CATEGORY_METADATA)) {
				// Basic check that icon is non-empty string
				expect(metadata.icon).toBeTruthy();
				expect(typeof metadata.icon).toBe('string');
			}
		});
	});

	describe('getCategoryBySlug', () => {
		it('should return category for valid slug', () => {
			const category = getCategoryBySlug('tech');
			expect(category).toBeDefined();
			expect(category?.name).toBe('Tech');
			expect(category?.slug).toBe('tech');
		});

		it('should return category for all valid slugs', () => {
			const validSlugs = ['tech', 'sports', 'arts', 'social', 'career'];
			for (const slug of validSlugs) {
				const category = getCategoryBySlug(slug);
				expect(category).toBeDefined();
				expect(category?.slug).toBe(slug);
			}
		});

		it('should return undefined for invalid slug', () => {
			expect(getCategoryBySlug('invalid')).toBeUndefined();
			expect(getCategoryBySlug('')).toBeUndefined();
			expect(getCategoryBySlug('Tech')).toBeUndefined(); // capitalized
		});
	});

	describe('getAllCategorySlugs', () => {
		it('should return all category slugs', () => {
			const slugs = getAllCategorySlugs();
			expect(slugs).toHaveLength(5);
			expect(slugs).toContain('tech');
			expect(slugs).toContain('sports');
			expect(slugs).toContain('arts');
			expect(slugs).toContain('social');
			expect(slugs).toContain('career');
		});

		it('should return lowercase slugs', () => {
			const slugs = getAllCategorySlugs();
			for (const slug of slugs) {
				expect(slug).toBe(slug.toLowerCase());
			}
		});

		it('should return unique slugs', () => {
			const slugs = getAllCategorySlugs();
			const uniqueSlugs = new Set(slugs);
			expect(uniqueSlugs.size).toBe(slugs.length);
		});
	});
});
