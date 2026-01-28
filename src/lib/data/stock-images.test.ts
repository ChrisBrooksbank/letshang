import { describe, it, expect } from 'vitest';
import {
	STOCK_IMAGES,
	STOCK_IMAGE_CATEGORIES,
	getImagesByCategory,
	getImageById,
	getAllCategories
} from './stock-images';

describe('Stock Images', () => {
	describe('STOCK_IMAGES', () => {
		it('should have at least one image', () => {
			expect(STOCK_IMAGES.length).toBeGreaterThan(0);
		});

		it('should have all required properties for each image', () => {
			STOCK_IMAGES.forEach((image) => {
				expect(image).toHaveProperty('id');
				expect(image).toHaveProperty('url');
				expect(image).toHaveProperty('category');
				expect(image).toHaveProperty('alt');

				expect(typeof image.id).toBe('string');
				expect(typeof image.url).toBe('string');
				expect(typeof image.category).toBe('string');
				expect(typeof image.alt).toBe('string');

				expect(image.id).toBeTruthy();
				expect(image.url).toBeTruthy();
				expect(image.category).toBeTruthy();
				expect(image.alt).toBeTruthy();
			});
		});

		it('should have valid URLs for all images', () => {
			STOCK_IMAGES.forEach((image) => {
				expect(() => new URL(image.url)).not.toThrow();
			});
		});

		it('should have unique IDs', () => {
			const ids = STOCK_IMAGES.map((img) => img.id);
			const uniqueIds = new Set(ids);
			expect(uniqueIds.size).toBe(ids.length);
		});

		it('should have images from defined categories', () => {
			STOCK_IMAGES.forEach((image) => {
				expect(STOCK_IMAGE_CATEGORIES).toContain(image.category);
			});
		});
	});

	describe('STOCK_IMAGE_CATEGORIES', () => {
		it('should have at least one category', () => {
			expect(STOCK_IMAGE_CATEGORIES.length).toBeGreaterThan(0);
		});

		it('should have only unique categories', () => {
			const uniqueCategories = new Set(STOCK_IMAGE_CATEGORIES);
			expect(uniqueCategories.size).toBe(STOCK_IMAGE_CATEGORIES.length);
		});

		it('should have at least one image per category', () => {
			STOCK_IMAGE_CATEGORIES.forEach((category) => {
				const images = STOCK_IMAGES.filter((img) => img.category === category);
				expect(images.length).toBeGreaterThan(0);
			});
		});
	});

	describe('getImagesByCategory', () => {
		it('should return images for a valid category', () => {
			const category = 'Technology';
			const images = getImagesByCategory(category);
			expect(images.length).toBeGreaterThan(0);
			images.forEach((img) => {
				expect(img.category).toBe(category);
			});
		});

		it('should return empty array for unknown category', () => {
			// @ts-expect-error Testing invalid input
			const images = getImagesByCategory('NonExistentCategory');
			expect(images).toEqual([]);
		});

		it('should return different images for different categories', () => {
			const techImages = getImagesByCategory('Technology');
			const sportsImages = getImagesByCategory('Sports & Fitness');

			const techIds = new Set(techImages.map((img) => img.id));
			const sportsIds = new Set(sportsImages.map((img) => img.id));

			// Sets should not be completely identical
			const intersection = new Set([...techIds].filter((id) => sportsIds.has(id)));
			expect(intersection.size).toBe(0);
		});
	});

	describe('getImageById', () => {
		it('should return image for valid ID', () => {
			const firstImage = STOCK_IMAGES[0];
			const found = getImageById(firstImage.id);
			expect(found).toEqual(firstImage);
		});

		it('should return undefined for invalid ID', () => {
			const found = getImageById('non-existent-id');
			expect(found).toBeUndefined();
		});

		it('should return exact image with all properties', () => {
			const testImage = STOCK_IMAGES[5];
			const found = getImageById(testImage.id);

			expect(found).toBeDefined();
			expect(found?.id).toBe(testImage.id);
			expect(found?.url).toBe(testImage.url);
			expect(found?.category).toBe(testImage.category);
			expect(found?.alt).toBe(testImage.alt);
		});
	});

	describe('getAllCategories', () => {
		it('should return all categories', () => {
			const categories = getAllCategories();
			expect(categories).toEqual(STOCK_IMAGE_CATEGORIES);
		});

		it('should return a new array (not reference)', () => {
			const categories1 = getAllCategories();
			const categories2 = getAllCategories();

			expect(categories1).toEqual(categories2);
			expect(categories1).not.toBe(categories2); // Different references
		});

		it('should have at least 5 categories', () => {
			const categories = getAllCategories();
			expect(categories.length).toBeGreaterThanOrEqual(5);
		});
	});

	describe('Coverage', () => {
		it('should have multiple images per major category', () => {
			const majorCategories = ['Technology', 'Social', 'Food & Drink'];
			majorCategories.forEach((category) => {
				const images = getImagesByCategory(category as (typeof STOCK_IMAGE_CATEGORIES)[number]);
				expect(images.length).toBeGreaterThanOrEqual(2);
			});
		});

		it('should have descriptive alt text for all images', () => {
			STOCK_IMAGES.forEach((image) => {
				expect(image.alt.length).toBeGreaterThan(5);
			});
		});
	});
});
