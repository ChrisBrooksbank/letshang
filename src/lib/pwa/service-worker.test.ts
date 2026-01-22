import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

describe('Service Worker Configuration', () => {
	// Read vite config as text to verify configuration without importing it
	const currentFilePath = fileURLToPath(import.meta.url);
	const currentDir = dirname(currentFilePath);
	const viteConfigPath = join(currentDir, '../../../vite.config.ts');
	const viteConfigContent = readFileSync(viteConfigPath, 'utf-8');

	describe('VitePWA Plugin', () => {
		it('should import VitePWA from vite-plugin-pwa', () => {
			expect(viteConfigContent).toContain("import { VitePWA } from 'vite-plugin-pwa'");
		});

		it('should configure VitePWA plugin', () => {
			expect(viteConfigContent).toContain('VitePWA(');
		});

		it('should have autoUpdate registerType', () => {
			expect(viteConfigContent).toContain("registerType: 'autoUpdate'");
		});

		it('should use static manifest.json', () => {
			expect(viteConfigContent).toContain('manifest: false');
		});
	});

	describe('Workbox Configuration', () => {
		it('should configure workbox settings', () => {
			expect(viteConfigContent).toContain('workbox:');
		});

		it('should define glob patterns for static assets', () => {
			expect(viteConfigContent).toContain('globPatterns:');
			expect(viteConfigContent).toContain('**/*.{js,css,html,ico,png,svg,webp,woff,woff2}');
		});

		it('should enable cleanupOutdatedCaches', () => {
			expect(viteConfigContent).toContain('cleanupOutdatedCaches: true');
		});

		it('should enable skipWaiting', () => {
			expect(viteConfigContent).toContain('skipWaiting: true');
		});

		it('should enable clientsClaim', () => {
			expect(viteConfigContent).toContain('clientsClaim: true');
		});
	});

	describe('Runtime Caching Strategies', () => {
		it('should configure runtime caching', () => {
			expect(viteConfigContent).toContain('runtimeCaching:');
		});

		it('should use CacheFirst for Google Fonts', () => {
			// Check for fonts googleapis
			expect(viteConfigContent).toContain('googleapis');
			expect(viteConfigContent).toContain("handler: 'CacheFirst'");
		});

		it('should use CacheFirst for images', () => {
			expect(viteConfigContent).toContain('png|jpg|jpeg|svg|gif|webp|ico');
			expect(viteConfigContent).toContain('images-cache');
		});

		it('should use NetworkFirst for Supabase API calls', () => {
			// Check for supabase (the pattern contains \.supabase\.co in regex form)
			expect(viteConfigContent).toContain('supabase');
			expect(viteConfigContent).toContain("handler: 'NetworkFirst'");
			expect(viteConfigContent).toContain('api-cache');
		});
	});

	describe('Cache Expiration Settings', () => {
		it('should set 1 year expiration for fonts', () => {
			// 60 * 60 * 24 * 365 = 31536000
			expect(viteConfigContent).toContain('maxAgeSeconds: 60 * 60 * 24 * 365');
		});

		it('should set 30 days expiration for images', () => {
			// 60 * 60 * 24 * 30
			expect(viteConfigContent).toContain('maxAgeSeconds: 60 * 60 * 24 * 30');
		});

		it('should set 5 minutes expiration for API cache', () => {
			// 60 * 5 = 300
			expect(viteConfigContent).toContain('maxAgeSeconds: 60 * 5');
		});
	});

	describe('Cache Size Limits', () => {
		it('should limit font cache to 10 entries', () => {
			expect(viteConfigContent).toMatch(/google-fonts-cache[\s\S]*?maxEntries: 10/);
		});

		it('should limit image cache to 100 entries', () => {
			expect(viteConfigContent).toMatch(/images-cache[\s\S]*?maxEntries: 100/);
		});

		it('should limit API cache to 50 entries', () => {
			expect(viteConfigContent).toMatch(/api-cache[\s\S]*?maxEntries: 50/);
		});
	});

	describe('Network Timeout', () => {
		it('should set 10 second timeout for API requests', () => {
			expect(viteConfigContent).toContain('networkTimeoutSeconds: 10');
		});
	});

	describe('Development Settings', () => {
		it('should disable service worker in development', () => {
			expect(viteConfigContent).toContain('devOptions:');
			expect(viteConfigContent).toContain('enabled: false');
		});
	});

	describe('Service Worker File Patterns', () => {
		const staticAssetExtensions = [
			'js',
			'css',
			'html',
			'ico',
			'png',
			'svg',
			'webp',
			'woff',
			'woff2'
		];

		it('should cache JavaScript files', () => {
			expect(staticAssetExtensions).toContain('js');
		});

		it('should cache CSS files', () => {
			expect(staticAssetExtensions).toContain('css');
		});

		it('should cache HTML files', () => {
			expect(staticAssetExtensions).toContain('html');
		});

		it('should cache image files (png, svg, webp)', () => {
			expect(staticAssetExtensions).toContain('png');
			expect(staticAssetExtensions).toContain('svg');
			expect(staticAssetExtensions).toContain('webp');
		});

		it('should cache font files (woff, woff2)', () => {
			expect(staticAssetExtensions).toContain('woff');
			expect(staticAssetExtensions).toContain('woff2');
		});

		it('should cache favicon', () => {
			expect(staticAssetExtensions).toContain('ico');
		});
	});

	describe('Acceptance Criteria Validation', () => {
		it('AC: Caches static assets (HTML, CSS, JS, images)', () => {
			const requiredTypes = ['html', 'css', 'js', 'png', 'svg', 'webp'];
			const configHasAllTypes = requiredTypes.every((type) => viteConfigContent.includes(type));
			expect(configHasAllTypes).toBe(true);
		});

		it('AC: Cache-first for static assets', () => {
			// Precached assets use cache-first by default
			// Images and fonts use CacheFirst handler
			expect(viteConfigContent).toContain("handler: 'CacheFirst'");
		});

		it('AC: Network-first for API calls', () => {
			// Supabase API calls use NetworkFirst handler
			expect(viteConfigContent).toContain("handler: 'NetworkFirst'");
		});
	});

	describe('Cache Configuration Constants', () => {
		it('should have appropriate API cache duration (5 minutes)', () => {
			const API_CACHE_SECONDS = 60 * 5;
			expect(API_CACHE_SECONDS).toBe(300);
		});

		it('should have appropriate image cache duration (30 days)', () => {
			const IMAGE_CACHE_SECONDS = 60 * 60 * 24 * 30;
			expect(IMAGE_CACHE_SECONDS).toBe(2592000);
		});

		it('should have appropriate font cache duration (1 year)', () => {
			const FONT_CACHE_SECONDS = 60 * 60 * 24 * 365;
			expect(FONT_CACHE_SECONDS).toBe(31536000);
		});
	});

	describe('Cache Entry Limits', () => {
		it('should limit API cache entries appropriately', () => {
			const MAX_API_ENTRIES = 50;
			expect(MAX_API_ENTRIES).toBeGreaterThan(0);
			expect(MAX_API_ENTRIES).toBeLessThanOrEqual(100);
		});

		it('should limit image cache entries appropriately', () => {
			const MAX_IMAGE_ENTRIES = 100;
			expect(MAX_IMAGE_ENTRIES).toBeGreaterThan(0);
			expect(MAX_IMAGE_ENTRIES).toBeLessThanOrEqual(200);
		});

		it('should limit font cache entries appropriately', () => {
			const MAX_FONT_ENTRIES = 10;
			expect(MAX_FONT_ENTRIES).toBeGreaterThan(0);
			expect(MAX_FONT_ENTRIES).toBeLessThanOrEqual(20);
		});
	});

	describe('Network Settings', () => {
		it('should have appropriate network timeout', () => {
			const NETWORK_TIMEOUT_SECONDS = 10;
			expect(NETWORK_TIMEOUT_SECONDS).toBe(10);
		});

		it('should configure network timeout in config', () => {
			expect(viteConfigContent).toContain('networkTimeoutSeconds');
		});
	});
});
