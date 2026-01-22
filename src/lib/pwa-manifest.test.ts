import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Buffer } from 'buffer';

describe('PWA Manifest', () => {
	const manifestPath = join(process.cwd(), 'static', 'manifest.json');
	const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));

	it('should have app name set to LetsHang', () => {
		expect(manifest.name).toBe('LetsHang');
		expect(manifest.short_name).toBe('LetsHang');
	});

	it('should have theme color set', () => {
		expect(manifest.theme_color).toBeDefined();
		expect(manifest.theme_color).toMatch(/^#[0-9a-f]{6}$/i);
	});

	it('should have standalone display mode', () => {
		expect(manifest.display).toBe('standalone');
	});

	it('should have 192px and 512px icons', () => {
		expect(manifest.icons).toBeDefined();
		expect(Array.isArray(manifest.icons)).toBe(true);

		const icon192 = manifest.icons.find((icon: { sizes: string }) => icon.sizes === '192x192');
		const icon512 = manifest.icons.find((icon: { sizes: string }) => icon.sizes === '512x512');

		expect(icon192).toBeDefined();
		expect(icon192.src).toBe('/icon-192.png');
		expect(icon192.type).toBe('image/png');

		expect(icon512).toBeDefined();
		expect(icon512.src).toBe('/icon-512.png');
		expect(icon512.type).toBe('image/png');
	});

	it('should have proper start_url', () => {
		expect(manifest.start_url).toBe('/');
	});

	it('should have background color', () => {
		expect(manifest.background_color).toBeDefined();
		expect(manifest.background_color).toMatch(/^#[0-9a-f]{6}$/i);
	});
});

describe('PWA Icon Files', () => {
	it('should have icon-192.png file', () => {
		const iconPath = join(process.cwd(), 'static', 'icon-192.png');
		expect(() => readFileSync(iconPath)).not.toThrow();
	});

	it('should have icon-512.png file', () => {
		const iconPath = join(process.cwd(), 'static', 'icon-512.png');
		expect(() => readFileSync(iconPath)).not.toThrow();
	});

	it('icon files should be valid PNG format', () => {
		const icon192 = readFileSync(join(process.cwd(), 'static', 'icon-192.png'));
		const icon512 = readFileSync(join(process.cwd(), 'static', 'icon-512.png'));

		// PNG signature: 89 50 4E 47 0D 0A 1A 0A
		const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

		expect(icon192.subarray(0, 8)).toEqual(pngSignature);
		expect(icon512.subarray(0, 8)).toEqual(pngSignature);
	});
});

describe('app.html PWA Configuration', () => {
	const appHtmlPath = join(process.cwd(), 'src', 'app.html');
	const appHtml = readFileSync(appHtmlPath, 'utf-8');

	it('should link to manifest.json', () => {
		expect(appHtml).toContain('rel="manifest"');
		expect(appHtml).toContain('href="/manifest.json"');
	});

	it('should have theme-color meta tag', () => {
		expect(appHtml).toContain('name="theme-color"');
		expect(appHtml).toMatch(/content="#[0-9a-f]{6}"/i);
	});

	it('should have icon links', () => {
		expect(appHtml).toContain('href="/icon-192.png"');
		expect(appHtml).toContain('href="/icon-512.png"');
	});
});
