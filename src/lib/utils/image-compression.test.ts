import { describe, it, expect } from 'vitest';
import {
	ACCEPTED_IMAGE_TYPES,
	MAX_IMAGE_SIZE_MB,
	MAX_IMAGE_SIZE_BYTES,
	TARGET_COMPRESSED_SIZE_KB,
	PROFILE_PHOTO_MAX_DIMENSION,
	isValidImageType,
	isValidImageSize,
	validateImageFile,
	dataUrlToBlob
} from './image-compression';

describe('image-compression', () => {
	describe('constants', () => {
		it('should have correct accepted image types', () => {
			expect(ACCEPTED_IMAGE_TYPES).toEqual(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
		});

		it('should have correct max image size', () => {
			expect(MAX_IMAGE_SIZE_MB).toBe(5);
			expect(MAX_IMAGE_SIZE_BYTES).toBe(5 * 1024 * 1024);
		});

		it('should have correct target compressed size', () => {
			expect(TARGET_COMPRESSED_SIZE_KB).toBe(500);
		});

		it('should have correct profile photo max dimension', () => {
			expect(PROFILE_PHOTO_MAX_DIMENSION).toBe(1024);
		});
	});

	describe('isValidImageType', () => {
		it('should accept JPEG images', () => {
			const file = new File([''], 'test.jpg', { type: 'image/jpeg' });
			expect(isValidImageType(file)).toBe(true);
		});

		it('should accept JPG images', () => {
			const file = new File([''], 'test.jpg', { type: 'image/jpg' });
			expect(isValidImageType(file)).toBe(true);
		});

		it('should accept PNG images', () => {
			const file = new File([''], 'test.png', { type: 'image/png' });
			expect(isValidImageType(file)).toBe(true);
		});

		it('should accept WebP images', () => {
			const file = new File([''], 'test.webp', { type: 'image/webp' });
			expect(isValidImageType(file)).toBe(true);
		});

		it('should reject GIF images', () => {
			const file = new File([''], 'test.gif', { type: 'image/gif' });
			expect(isValidImageType(file)).toBe(false);
		});

		it('should reject SVG images', () => {
			const file = new File([''], 'test.svg', { type: 'image/svg+xml' });
			expect(isValidImageType(file)).toBe(false);
		});

		it('should reject non-image files', () => {
			const file = new File([''], 'test.pdf', { type: 'application/pdf' });
			expect(isValidImageType(file)).toBe(false);
		});
	});

	describe('isValidImageSize', () => {
		it('should accept files under the size limit', () => {
			const size = 1 * 1024 * 1024; // 1MB
			const file = new File([new ArrayBuffer(size)], 'test.jpg', { type: 'image/jpeg' });
			expect(isValidImageSize(file)).toBe(true);
		});

		it('should accept files exactly at the size limit', () => {
			const size = MAX_IMAGE_SIZE_BYTES;
			const file = new File([new ArrayBuffer(size)], 'test.jpg', { type: 'image/jpeg' });
			expect(isValidImageSize(file)).toBe(true);
		});

		it('should reject files over the size limit', () => {
			const size = MAX_IMAGE_SIZE_BYTES + 1;
			const file = new File([new ArrayBuffer(size)], 'test.jpg', { type: 'image/jpeg' });
			expect(isValidImageSize(file)).toBe(false);
		});

		it('should accept empty files', () => {
			const file = new File([], 'test.jpg', { type: 'image/jpeg' });
			expect(isValidImageSize(file)).toBe(true);
		});
	});

	describe('validateImageFile', () => {
		it('should validate a valid JPEG file', () => {
			const file = new File([new ArrayBuffer(1024)], 'test.jpg', { type: 'image/jpeg' });
			const result = validateImageFile(file);
			expect(result.isValid).toBe(true);
			expect(result.error).toBeUndefined();
		});

		it('should validate a valid PNG file', () => {
			const file = new File([new ArrayBuffer(1024)], 'test.png', { type: 'image/png' });
			const result = validateImageFile(file);
			expect(result.isValid).toBe(true);
			expect(result.error).toBeUndefined();
		});

		it('should validate a valid WebP file', () => {
			const file = new File([new ArrayBuffer(1024)], 'test.webp', { type: 'image/webp' });
			const result = validateImageFile(file);
			expect(result.isValid).toBe(true);
			expect(result.error).toBeUndefined();
		});

		it('should reject invalid file type', () => {
			const file = new File([new ArrayBuffer(1024)], 'test.gif', { type: 'image/gif' });
			const result = validateImageFile(file);
			expect(result.isValid).toBe(false);
			expect(result.error).toBe('Please upload a JPG, PNG, or WebP image');
		});

		it('should reject file over size limit', () => {
			const size = MAX_IMAGE_SIZE_BYTES + 1;
			const file = new File([new ArrayBuffer(size)], 'test.jpg', { type: 'image/jpeg' });
			const result = validateImageFile(file);
			expect(result.isValid).toBe(false);
			expect(result.error).toBe(`Image size must be less than ${MAX_IMAGE_SIZE_MB}MB`);
		});

		it('should validate file at exactly the size limit', () => {
			const size = MAX_IMAGE_SIZE_BYTES;
			const file = new File([new ArrayBuffer(size)], 'test.jpg', { type: 'image/jpeg' });
			const result = validateImageFile(file);
			expect(result.isValid).toBe(true);
			expect(result.error).toBeUndefined();
		});

		it('should reject non-image files with appropriate error', () => {
			const file = new File([new ArrayBuffer(1024)], 'test.pdf', { type: 'application/pdf' });
			const result = validateImageFile(file);
			expect(result.isValid).toBe(false);
			expect(result.error).toBe('Please upload a JPG, PNG, or WebP image');
		});
	});

	describe('dataUrlToBlob', () => {
		it('should convert a PNG data URL to Blob', () => {
			const dataUrl =
				'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
			const blob = dataUrlToBlob(dataUrl);
			expect(blob).toBeInstanceOf(Blob);
			expect(blob.type).toBe('image/png');
			expect(blob.size).toBeGreaterThan(0);
		});

		it('should convert a JPEG data URL to Blob', () => {
			const dataUrl =
				'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA';
			const blob = dataUrlToBlob(dataUrl);
			expect(blob).toBeInstanceOf(Blob);
			expect(blob.type).toBe('image/jpeg');
			expect(blob.size).toBeGreaterThan(0);
		});

		it('should convert a WebP data URL to Blob', () => {
			const dataUrl =
				'data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAwA0JaQAA3AA/vuUAAA=';
			const blob = dataUrlToBlob(dataUrl);
			expect(blob).toBeInstanceOf(Blob);
			expect(blob.type).toBe('image/webp');
			expect(blob.size).toBeGreaterThan(0);
		});

		it('should handle data URL without explicit MIME type', () => {
			// If MIME type is missing, it defaults to 'image/png'
			const dataUrl =
				'data:;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
			const blob = dataUrlToBlob(dataUrl);
			expect(blob).toBeInstanceOf(Blob);
			expect(blob.type).toBe('image/png');
		});

		it('should produce correct byte array from base64', () => {
			// Simple 1x1 red pixel PNG
			const dataUrl =
				'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
			const blob = dataUrlToBlob(dataUrl);
			// The PNG should be 70 bytes (includes padding)
			expect(blob.size).toBe(70);
		});
	});
});
