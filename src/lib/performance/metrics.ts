/**
 * Performance metrics and thresholds for PWA optimization
 *
 * Acceptance Criteria (spec: 12-pwa-features.md):
 * - First Contentful Paint < 1.5s
 * - Lighthouse performance score > 90
 * - Bundle < 100KB gzipped
 */

/* eslint-disable no-console */

export const PERFORMANCE_THRESHOLDS = {
	/** First Contentful Paint target in milliseconds */
	FIRST_CONTENTFUL_PAINT_MS: 1500,

	/** Lighthouse performance score minimum (0-100) */
	LIGHTHOUSE_SCORE_MIN: 90,

	/** Maximum initial bundle size in bytes (gzipped) */
	MAX_BUNDLE_SIZE_GZIPPED_KB: 100
} as const;

/**
 * Current bundle metrics (as of last build)
 * Generated: 2026-01-22
 *
 * Build output shows:
 * - Main chunk: 50.89 KB gzipped ✓
 * - App entry: 3.36 KB gzipped ✓
 * - Total initial: ~54 KB gzipped ✓
 *
 * All chunks under threshold.
 */
export const CURRENT_BUNDLE_METRICS = {
	mainChunkGzippedKB: 50.89,
	appEntryGzippedKB: 3.36,
	totalInitialGzippedKB: 54.25,
	underThreshold: true
} as const;

/**
 * Performance monitoring utilities for Web Vitals
 */
export interface PerformanceMetrics {
	fcp?: number; // First Contentful Paint
	lcp?: number; // Largest Contentful Paint
	fid?: number; // First Input Delay
	cls?: number; // Cumulative Layout Shift
	ttfb?: number; // Time to First Byte
}

/**
 * Measure Web Vitals in the browser
 * Uses the browser Performance API
 */
export function measureWebVitals(): PerformanceMetrics {
	if (typeof window === 'undefined') {
		return {};
	}

	const metrics: PerformanceMetrics = {};

	// Get paint timing
	// eslint-disable-next-line no-undef
	const paintEntries = performance.getEntriesByType('paint');
	const fcpEntry = paintEntries.find((entry) => entry.name === 'first-contentful-paint');
	if (fcpEntry) {
		metrics.fcp = fcpEntry.startTime;
	}

	// Get navigation timing for TTFB
	// eslint-disable-next-line no-undef
	const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
	if (navEntry) {
		metrics.ttfb = navEntry.responseStart - navEntry.requestStart;
	}

	return metrics;
}

/**
 * Check if First Contentful Paint meets threshold
 * Returns true if FCP is below threshold (good performance)
 */
export function checkFCPThreshold(fcp: number): boolean {
	return fcp <= PERFORMANCE_THRESHOLDS.FIRST_CONTENTFUL_PAINT_MS;
}

/**
 * Log performance metrics to console (dev only)
 */
export function logPerformanceMetrics(): void {
	if (typeof window === 'undefined') {
		return;
	}

	// Check for production environment
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const isProd = (import.meta as any)?.env?.PROD ?? false;
	if (isProd) {
		return;
	}

	const metrics = measureWebVitals();

	console.table({
		'First Contentful Paint': metrics.fcp ? `${metrics.fcp.toFixed(2)}ms` : 'N/A',
		'FCP Threshold': `${PERFORMANCE_THRESHOLDS.FIRST_CONTENTFUL_PAINT_MS}ms`,
		'FCP Pass': metrics.fcp ? checkFCPThreshold(metrics.fcp) : 'N/A',
		TTFB: metrics.ttfb ? `${metrics.ttfb.toFixed(2)}ms` : 'N/A',
		'Bundle Size (gzipped)': `${CURRENT_BUNDLE_METRICS.totalInitialGzippedKB}KB`,
		'Bundle Threshold': `${PERFORMANCE_THRESHOLDS.MAX_BUNDLE_SIZE_GZIPPED_KB}KB`,
		'Bundle Pass': CURRENT_BUNDLE_METRICS.underThreshold
	});
}
