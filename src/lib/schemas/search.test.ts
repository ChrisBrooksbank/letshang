// Tests for search schemas
// Validates search query validation rules

import { describe, it, expect } from 'vitest';
import {
	searchQuerySchema,
	searchFiltersSchema,
	searchWithFiltersSchema,
	eventTypeEnum,
	eventSizeEnum
} from './search';

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

	describe('eventTypeEnum', () => {
		it('should accept valid event types', () => {
			expect(eventTypeEnum.parse('in_person')).toBe('in_person');
			expect(eventTypeEnum.parse('online')).toBe('online');
			expect(eventTypeEnum.parse('hybrid')).toBe('hybrid');
		});

		it('should reject invalid event types', () => {
			expect(() => eventTypeEnum.parse('invalid')).toThrow();
		});
	});

	describe('eventSizeEnum', () => {
		it('should accept valid event sizes', () => {
			expect(eventSizeEnum.parse('intimate')).toBe('intimate');
			expect(eventSizeEnum.parse('small')).toBe('small');
			expect(eventSizeEnum.parse('medium')).toBe('medium');
			expect(eventSizeEnum.parse('large')).toBe('large');
		});

		it('should reject invalid event sizes', () => {
			expect(() => eventSizeEnum.parse('huge')).toThrow();
		});
	});

	describe('searchFiltersSchema', () => {
		it('should accept valid event type filter', () => {
			const result = searchFiltersSchema.parse({
				eventType: 'online'
			});

			expect(result.eventType).toBe('online');
		});

		it('should accept valid date range filter', () => {
			const result = searchFiltersSchema.parse({
				startDate: '2026-02-01T00:00:00Z',
				endDate: '2026-02-28T23:59:59Z'
			});

			expect(result.startDate).toBe('2026-02-01T00:00:00Z');
			expect(result.endDate).toBe('2026-02-28T23:59:59Z');
		});

		it('should accept valid event size filter', () => {
			const result = searchFiltersSchema.parse({
				eventSize: 'small'
			});

			expect(result.eventSize).toBe('small');
		});

		it('should accept all filters together', () => {
			const result = searchFiltersSchema.parse({
				eventType: 'hybrid',
				startDate: '2026-03-01T00:00:00Z',
				endDate: '2026-03-31T23:59:59Z',
				eventSize: 'medium'
			});

			expect(result.eventType).toBe('hybrid');
			expect(result.startDate).toBe('2026-03-01T00:00:00Z');
			expect(result.endDate).toBe('2026-03-31T23:59:59Z');
			expect(result.eventSize).toBe('medium');
		});

		it('should accept empty filters object', () => {
			const result = searchFiltersSchema.parse({});
			expect(result).toEqual({});
		});

		it('should reject invalid date format for startDate', () => {
			expect(() =>
				searchFiltersSchema.parse({
					startDate: 'not-a-date'
				})
			).toThrow();
		});

		it('should reject invalid date format for endDate', () => {
			expect(() =>
				searchFiltersSchema.parse({
					endDate: '2026-02-30' // Missing time component
				})
			).toThrow();
		});
	});

	describe('searchWithFiltersSchema', () => {
		it('should accept search query with filters', () => {
			const result = searchWithFiltersSchema.parse({
				query: 'yoga',
				type: 'events',
				eventType: 'in_person',
				eventSize: 'intimate'
			});

			expect(result.query).toBe('yoga');
			expect(result.type).toBe('events');
			expect(result.eventType).toBe('in_person');
			expect(result.eventSize).toBe('intimate');
		});

		it('should accept search query without filters', () => {
			const result = searchWithFiltersSchema.parse({
				query: 'book club',
				type: 'all'
			});

			expect(result.query).toBe('book club');
			expect(result.type).toBe('all');
			expect(result.eventType).toBeUndefined();
		});

		it('should apply default type when not provided', () => {
			const result = searchWithFiltersSchema.parse({
				query: 'hiking',
				eventType: 'online'
			});

			expect(result.type).toBe('all');
			expect(result.eventType).toBe('online');
		});
	});
});
