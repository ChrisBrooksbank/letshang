#!/usr/bin/env node

/**
 * Generate properly sized PWA icons using pure Node.js
 * Creates actual 192x192 and 512x512 PNG files with the theme color
 */

import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import zlib from 'zlib';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const THEME_COLOR = { r: 99, g: 102, b: 241 }; // #6366f1

/**
 * Creates a PNG file with solid color of specified size
 */
function createPNG(width, height, { r, g, b }) {
	// PNG signature
	const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

	// IHDR chunk
	const ihdrData = Buffer.alloc(13);
	ihdrData.writeUInt32BE(width, 0);
	ihdrData.writeUInt32BE(height, 4);
	ihdrData.writeUInt8(8, 8); // Bit depth
	ihdrData.writeUInt8(2, 9); // Color type (RGB)
	ihdrData.writeUInt8(0, 10); // Compression
	ihdrData.writeUInt8(0, 11); // Filter
	ihdrData.writeUInt8(0, 12); // Interlace

	const ihdr = createChunk('IHDR', ihdrData);

	// Create raw image data (filter byte + RGB for each row)
	const rowSize = 1 + width * 3; // filter byte + RGB pixels
	const rawData = Buffer.alloc(height * rowSize);

	for (let y = 0; y < height; y++) {
		const rowOffset = y * rowSize;
		rawData[rowOffset] = 0; // Filter: None

		for (let x = 0; x < width; x++) {
			const pixelOffset = rowOffset + 1 + x * 3;
			rawData[pixelOffset] = r;
			rawData[pixelOffset + 1] = g;
			rawData[pixelOffset + 2] = b;
		}
	}

	// Compress with zlib
	const compressed = zlib.deflateSync(rawData, { level: 9 });
	const idat = createChunk('IDAT', compressed);

	// IEND chunk
	const iend = createChunk('IEND', Buffer.alloc(0));

	return Buffer.concat([signature, ihdr, idat, iend]);
}

/**
 * Create a PNG chunk with type, data, and CRC
 */
function createChunk(type, data) {
	const typeBuffer = Buffer.from(type, 'ascii');
	const length = Buffer.alloc(4);
	length.writeUInt32BE(data.length, 0);

	const crcInput = Buffer.concat([typeBuffer, data]);
	const crc = Buffer.alloc(4);
	crc.writeUInt32BE(crc32(crcInput), 0);

	return Buffer.concat([length, typeBuffer, data, crc]);
}

/**
 * CRC32 calculation for PNG chunks
 */
function crc32(buf) {
	let crc = 0xffffffff;
	for (let i = 0; i < buf.length; i++) {
		crc = crc ^ buf[i];
		for (let j = 0; j < 8; j++) {
			crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
		}
	}
	return (crc ^ 0xffffffff) >>> 0;
}

// Generate icons
const staticDir = join(__dirname, '..', 'static');

console.log('Generating PWA icons...');

const icon192 = createPNG(192, 192, THEME_COLOR);
writeFileSync(join(staticDir, 'icon-192.png'), icon192);
console.log(`  ✓ icon-192.png (${icon192.length} bytes)`);

const icon512 = createPNG(512, 512, THEME_COLOR);
writeFileSync(join(staticDir, 'icon-512.png'), icon512);
console.log(`  ✓ icon-512.png (${icon512.length} bytes)`);

console.log('\nDone! Icons generated with theme color #6366f1');
