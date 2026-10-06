import { describe, it, expect } from 'vitest';
import { safeRedirectPath } from './safe-redirect';

describe('safeRedirectPath', () => {
	it('should allow same-origin paths', () => {
		expect(safeRedirectPath('/events/123')).toBe('/events/123');
		expect(safeRedirectPath('/groups/abc?tab=members#top')).toBe('/groups/abc?tab=members#top');
	});

	it('should fall back when no target is given', () => {
		expect(safeRedirectPath(null)).toBe('/dashboard');
		expect(safeRedirectPath(undefined)).toBe('/dashboard');
		expect(safeRedirectPath('')).toBe('/dashboard');
	});

	it('should use a custom fallback', () => {
		expect(safeRedirectPath('https://evil.example', '/home')).toBe('/home');
	});

	it.each([
		'https://evil.example',
		'http://evil.example/path',
		'//evil.example',
		'/\\evil.example',
		'javascript:alert(1)',
		'evil.example',
		'/\tevil',
		'/\n/evil.example'
	])('should reject unsafe target %j', (target) => {
		expect(safeRedirectPath(target)).toBe('/dashboard');
	});
});
