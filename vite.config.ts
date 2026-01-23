import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
	plugins: [
		sveltekit(),
		VitePWA({
			registerType: 'autoUpdate',
			manifest: false, // Use static/manifest.json instead
			workbox: {
				// Cache static assets using cache-first strategy
				globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff,woff2}'],
				// Runtime caching strategies
				runtimeCaching: [
					{
						// Cache-first strategy for static assets
						urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
						handler: 'CacheFirst',
						options: {
							cacheName: 'google-fonts-cache',
							expiration: {
								maxEntries: 10,
								maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
							},
							cacheableResponse: {
								statuses: [0, 200]
							}
						}
					},
					{
						// Cache-first for images
						urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
						handler: 'CacheFirst',
						options: {
							cacheName: 'images-cache',
							expiration: {
								maxEntries: 100,
								maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
							}
						}
					},
					{
						// Network-first for API calls (Supabase)
						urlPattern: /^https:\/\/.*\.supabase\.co\/.*$/,
						handler: 'NetworkFirst',
						options: {
							cacheName: 'api-cache',
							networkTimeoutSeconds: 10,
							expiration: {
								maxEntries: 50,
								maxAgeSeconds: 60 * 5 // 5 minutes
							},
							cacheableResponse: {
								statuses: [0, 200]
							}
						}
					}
				],
				// Don't cache during development
				cleanupOutdatedCaches: true,
				skipWaiting: true,
				clientsClaim: true
			},
			devOptions: {
				enabled: false // Disable service worker in development
			}
		})
	],
	test: {
		globals: true,
		environment: 'jsdom',
		setupFiles: ['./src/setupTests.ts'],
		include: ['src/**/*.{test,spec}.{js,ts}'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html'],
			exclude: [
				'node_modules/',
				'src/setupTests.ts',
				'**/*.d.ts',
				'**/*.config.*',
				'**/mockData/',
				'**/.svelte-kit/'
			],
			thresholds: {
				lines: 80,
				branches: 80,
				functions: 75, // Reduced due to browser-specific code in image-compression.ts
				statements: 80
			}
		}
	}
});
