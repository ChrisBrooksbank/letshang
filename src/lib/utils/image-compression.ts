/* eslint-disable no-undef */
// Browser APIs like File, Blob, FileReader, etc. are not defined in Node.js
// but will be available at runtime in the browser
import imageCompression from 'browser-image-compression';

/**
 * Accepted image file types for profile photos
 */
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

/**
 * Maximum file size in bytes for uploaded images (5MB)
 */
export const MAX_IMAGE_SIZE_MB = 5;
export const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;

/**
 * Target compressed file size in KB (500KB)
 */
export const TARGET_COMPRESSED_SIZE_KB = 500;

/**
 * Maximum dimensions for profile photo (square)
 */
export const PROFILE_PHOTO_MAX_DIMENSION = 1024;

/**
 * Validates if a file is an accepted image type
 * @param file - The file to validate
 * @returns true if the file is an accepted image type
 */
export function isValidImageType(file: File): boolean {
	return ACCEPTED_IMAGE_TYPES.includes(file.type);
}

/**
 * Validates if a file size is within the acceptable limit
 * @param file - The file to validate
 * @returns true if the file size is within the limit
 */
export function isValidImageSize(file: File): boolean {
	return file.size <= MAX_IMAGE_SIZE_BYTES;
}

/**
 * Validates an image file for profile photo upload
 * @param file - The file to validate
 * @returns Object with isValid boolean and error message if invalid
 */
export function validateImageFile(file: File): { isValid: boolean; error?: string } {
	if (!isValidImageType(file)) {
		return {
			isValid: false,
			error: 'Please upload a JPG, PNG, or WebP image'
		};
	}

	if (!isValidImageSize(file)) {
		return {
			isValid: false,
			error: `Image size must be less than ${MAX_IMAGE_SIZE_MB}MB`
		};
	}

	return { isValid: true };
}

/**
 * Compresses an image file to meet size requirements
 * @param file - The image file to compress
 * @returns Compressed image blob
 */
export async function compressImage(file: File): Promise<Blob> {
	const options = {
		maxSizeMB: TARGET_COMPRESSED_SIZE_KB / 1024, // Convert KB to MB
		maxWidthOrHeight: PROFILE_PHOTO_MAX_DIMENSION,
		useWebWorker: true,
		fileType: 'image/webp' // Convert all images to WebP for better compression
	};

	try {
		const compressedFile = await imageCompression(file, options);
		return compressedFile;
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error('Error compressing image:', error);
		throw new Error('Failed to compress image');
	}
}

/**
 * Creates a data URL from a File or Blob for preview
 * @param file - The file to convert
 * @returns Promise resolving to a data URL string
 */
export function createImagePreviewUrl(file: File | Blob): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result as string);
		reader.onerror = reject;
		reader.readAsDataURL(file);
	});
}

/**
 * Converts a data URL to a Blob
 * @param dataUrl - The data URL to convert
 * @returns Blob representation of the image
 */
export function dataUrlToBlob(dataUrl: string): Blob {
	const arr = dataUrl.split(',');
	const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
	const bstr = atob(arr[1]);
	let n = bstr.length;
	const u8arr = new Uint8Array(n);

	while (n--) {
		u8arr[n] = bstr.charCodeAt(n);
	}

	return new Blob([u8arr], { type: mime });
}

/**
 * Crops an image from a canvas and returns it as a Blob
 * @param imageSrc - Source image URL or data URL
 * @param crop - Crop parameters {x, y, width, height}
 * @returns Promise resolving to cropped image Blob
 */
export async function getCroppedImage(
	imageSrc: string,
	crop: { x: number; y: number; width: number; height: number }
): Promise<Blob> {
	const image = await createImage(imageSrc);
	const canvas = document.createElement('canvas');
	const ctx = canvas.getContext('2d');

	if (!ctx) {
		throw new Error('Failed to get canvas context');
	}

	// Set canvas size to match crop dimensions
	canvas.width = crop.width;
	canvas.height = crop.height;

	// Draw the cropped image
	ctx.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height);

	// Convert canvas to blob
	return new Promise((resolve, reject) => {
		canvas.toBlob((blob) => {
			if (!blob) {
				reject(new Error('Failed to create blob from canvas'));
				return;
			}
			resolve(blob);
		}, 'image/webp');
	});
}

/**
 * Helper function to create an HTMLImageElement from a source URL
 * @param url - Image source URL
 * @returns Promise resolving to HTMLImageElement
 */
function createImage(url: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const image = new Image();
		image.addEventListener('load', () => resolve(image));
		image.addEventListener('error', (error) => reject(error));
		image.src = url;
	});
}
