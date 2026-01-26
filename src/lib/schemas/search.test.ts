// Tests for search schemas
// Validates search query validation rules

import { describe, it, expect } from 'vitest';
import { searchQuerySchema } from './search';

describe('Search Schema Validation', () => {
	describe('searchQuerySchema', () => {
		it('should accept valid search query', () => {
			const result = searchQuerySchema.parse({
				query: 'yoga class',
				type: 'all'
			});

			expect(result.query).toBe('yoga class');
			expect(result.type).toBe('all');
		});

		it('should trim whitespace from query', () => {
			const result = searchQuerySchema.parse({
				query: '  hiking  ',
				type: 'events'
			});

			expect(result.query).toBe('hiking');
		});

		it('should default type to "all" if not provided', () => {
			const result = searchQuerySchema.parse({
				query: 'book club'
			});

			expect(result.type).toBe('all');
		});

		it('should accept "events" as type', () => {
			const result = searchQuerySchema.parse({
				query: 'test',
				type: 'events'
			});

			expect(result.type).toBe('events');
		});

		it('should accept "groups" as type', () => {
			const result = searchQuerySchema.parse({
				query: 'test',
				type: 'groups'
			});

			expect(result.type).toBe('groups');
		});

		it('should reject empty query', () => {
			expect(() =>
				searchQuerySchema.parse({
					query: '',
					type: 'all'
				})
			).toThrow();
		});

		it('should reject whitespace-only query', () => {
			expect(() =>
				searchQuerySchema.parse({
					query: '   ',
					type: 'all'
				})
			).toThrow();
		});

		it('should reject query longer than 100 characters', () => {
			const longQuery = 'a'.repeat(101);
			expect(() =>
				searchQuerySchema.parse({
					query: longQuery,
					type: 'all'
				})
			).toThrow();
		});

		it('should accept query exactly 100 characters', () => {
			const query = 'a'.repeat(100);
			const result = searchQuerySchema.parse({
				query,
				type: 'all'
			});

			expect(result.query).toBe(query);
		});

		it('should reject invalid type', () => {
			expect(() =>
				searchQuerySchema.parse({
					query: 'test',
					type: 'invalid'
				})
			).toThrow();
		});

		it('should accept single character query', () => {
			const result = searchQuerySchema.parse({
				query: 'a',
				type: 'all'
			});

			expect(result.query).toBe('a');
		});

		it('should accept queries with special characters', () => {
			const result = searchQuerySchema.parse({
				query: 'yoga & meditation',
				type: 'all'
			});

			expect(result.query).toBe('yoga & meditation');
		});

		it('should accept queries with numbers', () => {
			const result = searchQuerySchema.parse({
				query: 'web3 blockchain',
				type: 'all'
			});

			expect(result.query).toBe('web3 blockchain');
		});
	});
});
