import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [sveltekit()],
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
				functions: 80,
				statements: 80
			}
		}
	}
});
