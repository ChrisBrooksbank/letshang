#!/usr/bin/env node

/**
 * Generate placeholder PWA icons using pure Node.js (no dependencies)
 *
 * Creates simple solid color PNG files as placeholders.
 * For production, replace with professionally designed icons.
 */

import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const THEME_COLOR_RGB = [99, 102, 241]; // #6366f1 in RGB

/**
 * Creates a minimal PNG file with solid color
 * This is a very basic PNG encoder for placeholder purposes
 */
function createMinimalPNG(size, r, g, b) {
	// For simplicity, create a 1x1 PNG that browsers will scale
	// This is the smallest valid PNG possible
	const width = 1;
	const height = 1;

	// PNG signature
	const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

	// IHDR chunk (image header)
	const ihdr = Buffer.alloc(25);
	ihdr.writeUInt32BE(13, 0); // Length
	ihdr.write('IHDR', 4);
	ihdr.writeUInt32BE(width, 8); // Width
	ihdr.writeUInt32BE(height, 12); // Height
	ihdr.writeUInt8(8, 16); // Bit depth
	ihdr.writeUInt8(2, 17); // Color type (RGB)
	ihdr.writeUInt8(0, 18); // Compression
	ihdr.writeUInt8(0, 19); // Filter
	ihdr.writeUInt8(0, 20); // Interlace
	// CRC
	const ihdrCrc = crc32(ihdr.subarray(4, 21));
	ihdr.writeUInt32BE(ihdrCrc, 21);

	// IDAT chunk (image data)
	// Deflate compressed RGB pixel data
	// For a 1x1 image: filter byte (0) + RGB bytes
	const pixelData = Buffer.from([0, r, g, b]); // Filter 0, then RGB
	const compressed = zlibMinimal(pixelData);

	const idat = Buffer.alloc(12 + compressed.length);
	idat.writeUInt32BE(compressed.length, 0);
	idat.write('IDAT', 4);
	compressed.copy(idat, 8);
	const idatCrc = crc32(idat.subarray(4, 8 + compressed.length));
	idat.writeUInt32BE(idatCrc, 8 + compressed.length);

	// IEND chunk
	const iend = Buffer.from([
		0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82
	]);

	return Buffer.concat([signature, ihdr, idat, iend]);
}

/**
 * Minimal zlib compression (uncompressed block)
 */
function zlibMinimal(data) {
	const cmf = 0x78; // Compression method and flags
	const flg = 0x01; // Flags
	const header = Buffer.from([cmf, flg]);

	// Uncompressed block
	const len = data.length;
	const nlen = ~len & 0xffff;
	const block = Buffer.alloc(5 + data.length);
	block.writeUInt8(0x01, 0); // Final block, uncompressed
	block.writeUInt16LE(len, 1);
	block.writeUInt16LE(nlen, 3);
	data.copy(block, 5);

	// Adler-32 checksum
	const adler = adler32(data);
	const checksum = Buffer.alloc(4);
	checksum.writeUInt32BE(adler, 0);

	return Buffer.concat([header, block, checksum]);
}

/**
 * CRC32 calculation
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

/**
 * Adler-32 calculation
 */
function adler32(buf) {
	let s1 = 1;
	let s2 = 0;
	for (let i = 0; i < buf.length; i++) {
		s1 = (s1 + buf[i]) % 65521;
		s2 = (s2 + s1) % 65521;
	}
	return (s2 << 16) | s1;
}

// Generate icons
const staticDir = join(__dirname, '..', 'static');

const [r, g, b] = THEME_COLOR_RGB;
const icon = createMinimalPNG(1, r, g, b);

// Write the same 1x1 PNG for both sizes
// Browsers will scale appropriately
writeFileSync(join(staticDir, 'icon-192.png'), icon);
writeFileSync(join(staticDir, 'icon-512.png'), icon);

// Write readme
const readme = `# PWA Icons

These are placeholder icons for development (1x1 solid color PNG files).

## Production Icons

⚠️ **IMPORTANT**: These are minimal placeholders. Before deploying to production, replace with professionally designed icons:

1. Create 192x192px and 512x512px PNG icons with actual artwork
2. Replace icon-192.png and icon-512.png in this directory
3. Ensure icons follow PWA guidelines:
   - Simple, recognizable design
   - Works well when masked (safe area in center)
   - High contrast for visibility
   - Properly sized (not scaled 1x1 pixels)

## Current Placeholders

- icon-192.png: 1x1 PNG (theme color: #6366f1)
- icon-512.png: 1x1 PNG (theme color: #6366f1)

These will be scaled by the browser but are NOT suitable for production.

## Regenerating Icons

Run this script to regenerate placeholder icons:

\`\`\`bash
node scripts/generate-icons-simple.js
\`\`\`
`;

writeFileSync(join(staticDir, 'ICONS_README.md'), readme, 'utf-8');

console.log('✓ Generated minimal PWA icon placeholders');
console.log('  - static/icon-192.png (1x1 scaled)');
console.log('  - static/icon-512.png (1x1 scaled)');
console.log('  - static/ICONS_README.md');
console.log('');
console.log('⚠️  These are 1x1 pixel placeholders.');
console.log('   Replace with proper artwork before production deployment.');
