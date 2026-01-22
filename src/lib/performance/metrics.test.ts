/* eslint-disable no-console */
/* eslint-disable no-undef */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
	PERFORMANCE_THRESHOLDS,
	CURRENT_BUNDLE_METRICS,
	checkFCPThreshold,
	measureWebVitals,
	logPerformanceMetrics
} from './metrics';

describe('Performance Metrics', () => {
	describe('PERFORMANCE_THRESHOLDS', () => {
		it('should define FCP threshold of 1500ms', () => {
			expect(PERFORMANCE_THRESHOLDS.FIRST_CONTENTFUL_PAINT_MS).toBe(1500);
		});

		it('should define Lighthouse score minimum of 90', () => {
			expect(PERFORMANCE_THRESHOLDS.LIGHTHOUSE_SCORE_MIN).toBe(90);
		});

		it('should define bundle size threshold of 100KB', () => {
			expect(PERFORMANCE_THRESHOLDS.MAX_BUNDLE_SIZE_GZIPPED_KB).toBe(100);
		});

		it('should be a constant object', () => {
			// TypeScript enforces readonly at compile time
			// Runtime check that the values exist
			expect(PERFORMANCE_THRESHOLDS).toBeDefined();
			expect(typeof PERFORMANCE_THRESHOLDS).toBe('object');
		});
	});

	describe('CURRENT_BUNDLE_METRICS', () => {
		it('should document main chunk size under threshold', () => {
			expect(CURRENT_BUNDLE_METRICS.mainChunkGzippedKB).toBeLessThan(
				PERFORMANCE_THRESHOLDS.MAX_BUNDLE_SIZE_GZIPPED_KB
			);
		});

		it('should document total bundle size under threshold', () => {
			expect(CURRENT_BUNDLE_METRICS.totalInitialGzippedKB).toBeLessThan(
				PERFORMANCE_THRESHOLDS.MAX_BUNDLE_SIZE_GZIPPED_KB
			);
		});

		it('should indicate bundle is under threshold', () => {
			expect(CURRENT_BUNDLE_METRICS.underThreshold).toBe(true);
		});

		it('should have positive bundle sizes', () => {
			expect(CURRENT_BUNDLE_METRICS.mainChunkGzippedKB).toBeGreaterThan(0);
			expect(CURRENT_BUNDLE_METRICS.appEntryGzippedKB).toBeGreaterThan(0);
			expect(CURRENT_BUNDLE_METRICS.totalInitialGzippedKB).toBeGreaterThan(0);
		});

		it('should be a constant object', () => {
			// TypeScript enforces readonly at compile time
			// Runtime check that the values exist
			expect(CURRENT_BUNDLE_METRICS).toBeDefined();
			expect(typeof CURRENT_BUNDLE_METRICS).toBe('object');
		});
	});

	describe('checkFCPThreshold', () => {
		it('should return true for FCP under threshold', () => {
			expect(checkFCPThreshold(1000)).toBe(true);
			expect(checkFCPThreshold(1499)).toBe(true);
		});

		it('should return true for FCP at threshold', () => {
			expect(checkFCPThreshold(1500)).toBe(true);
		});

		it('should return false for FCP above threshold', () => {
			expect(checkFCPThreshold(1501)).toBe(false);
			expect(checkFCPThreshold(2000)).toBe(false);
		});

		it('should handle edge case of exactly threshold', () => {
			const threshold = PERFORMANCE_THRESHOLDS.FIRST_CONTENTFUL_PAINT_MS;
			expect(checkFCPThreshold(threshold)).toBe(true);
			expect(checkFCPThreshold(threshold - 1)).toBe(true);
			expect(checkFCPThreshold(threshold + 1)).toBe(false);
		});

		it('should handle zero FCP', () => {
			expect(checkFCPThreshold(0)).toBe(true);
		});
	});

	describe('measureWebVitals', () => {
		beforeEach(() => {
			vi.stubGlobal('window', {});
			vi.stubGlobal('performance', {
				getEntriesByType: vi.fn()
			});
		});

		it('should return empty object in server environment', () => {
			vi.stubGlobal('window', undefined);
			const metrics = measureWebVitals();
			expect(metrics).toEqual({});
		});

		it('should measure FCP when available', () => {
			const mockPaintEntries = [
				{ name: 'first-paint', startTime: 500 },
				{ name: 'first-contentful-paint', startTime: 800 }
			];

			vi.mocked(performance.getEntriesByType).mockImplementation((type: string) => {
				if (type === 'paint') return mockPaintEntries as PerformanceEntryList;
				return [] as PerformanceEntryList;
			});

			const metrics = measureWebVitals();
			expect(metrics.fcp).toBe(800);
		});

		it('should measure TTFB when navigation timing available', () => {
			const mockNavEntry = {
				requestStart: 100,
				responseStart: 250
			} as PerformanceNavigationTiming;

			vi.mocked(performance.getEntriesByType).mockImplementation((type: string) => {
				if (type === 'navigation') return [mockNavEntry] as PerformanceEntryList;
				return [] as PerformanceEntryList;
			});

			const metrics = measureWebVitals();
			expect(metrics.ttfb).toBe(150);
		});

		it('should handle missing paint entries', () => {
			vi.mocked(performance.getEntriesByType).mockReturnValue([]);

			const metrics = measureWebVitals();
			expect(metrics.fcp).toBeUndefined();
			expect(metrics.ttfb).toBeUndefined();
		});

		it('should handle partial data', () => {
			const mockPaintEntries = [{ name: 'first-paint', startTime: 500 }];

			vi.mocked(performance.getEntriesByType).mockImplementation((type: string) => {
				if (type === 'paint') return mockPaintEntries as PerformanceEntryList;
				return [] as PerformanceEntryList;
			});

			const metrics = measureWebVitals();
			expect(metrics.fcp).toBeUndefined(); // FCP not in entries
			expect(metrics.ttfb).toBeUndefined(); // No navigation entries
		});
	});

	describe('logPerformanceMetrics', () => {
		beforeEach(() => {
			vi.stubGlobal('window', {});
			vi.stubGlobal('console', {
				table: vi.fn()
			});
			vi.stubGlobal('performance', {
				getEntriesByType: vi.fn().mockReturnValue([])
			});
		});

		it('should not log in server environment', () => {
			vi.stubGlobal('window', undefined);
			logPerformanceMetrics();
			expect(console.table).not.toHaveBeenCalled();
		});

		it('should log metrics table in browser environment', () => {
			const mockPaintEntries = [{ name: 'first-contentful-paint', startTime: 800 }];
			const mockNavEntry = {
				requestStart: 100,
				responseStart: 250,
				duration: 0,
				entryType: 'navigation',
				name: 'document',
				startTime: 0,
				toJSON: () => ({})
			};

			vi.stubGlobal('performance', {
				getEntriesByType: vi.fn().mockImplementation((type: string) => {
					if (type === 'paint') return mockPaintEntries as PerformanceEntryList;
					if (type === 'navigation') return [mockNavEntry] as PerformanceEntryList;
					return [] as PerformanceEntryList;
				})
			});

			logPerformanceMetrics();

			expect(console.table).toHaveBeenCalled();
			const callArg = vi.mocked(console.table).mock.calls[0][0] as Record<string, string>;

			expect(callArg['First Contentful Paint']).toBe('800.00ms');
			expect(callArg['FCP Threshold']).toBe('1500ms');
			expect(callArg['FCP Pass']).toBe(true);
			expect(callArg['TTFB']).toBe('150.00ms');
			expect(callArg['Bundle Size (gzipped)']).toBe(
				`${CURRENT_BUNDLE_METRICS.totalInitialGzippedKB}KB`
			);
			expect(callArg['Bundle Threshold']).toBe('100KB');
			expect(callArg['Bundle Pass']).toBe(true);
		});

		it('should handle missing FCP data', () => {
			logPerformanceMetrics();

			expect(console.table).toHaveBeenCalled();
			const callArg = vi.mocked(console.table).mock.calls[0][0] as Record<string, string>;

			expect(callArg['First Contentful Paint']).toBe('N/A');
			expect(callArg['FCP Pass']).toBe('N/A');
			expect(callArg['TTFB']).toBe('N/A');
		});
	});
});
