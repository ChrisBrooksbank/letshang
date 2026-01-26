import { describe, it, expect } from 'vitest';
import {
	calculateEventSize,
	getEventSizeLabel,
	getEventSizeDescription,
	getEventSizeCapacityRange,
	type EventSize
} from './event-size';

describe('calculateEventSize', () => {
	describe('intimate size (< 10)', () => {
		it('should return "intimate" for capacity of 1', () => {
			expect(calculateEventSize(1)).toBe('intimate');
		});

		it('should return "intimate" for capacity of 5', () => {
			expect(calculateEventSize(5)).toBe('intimate');
		});

		it('should return "intimate" for capacity of 9', () => {
			expect(calculateEventSize(9)).toBe('intimate');
		});
	});

	describe('small size (10-19)', () => {
		it('should return "small" for capacity of 10', () => {
			expect(calculateEventSize(10)).toBe('small');
		});

		it('should return "small" for capacity of 15', () => {
			expect(calculateEventSize(15)).toBe('small');
		});

		it('should return "small" for capacity of 19', () => {
			expect(calculateEventSize(19)).toBe('small');
		});
	});

	describe('medium size (20-49)', () => {
		it('should return "medium" for capacity of 20', () => {
			expect(calculateEventSize(20)).toBe('medium');
		});

		it('should return "medium" for capacity of 30', () => {
			expect(calculateEventSize(30)).toBe('medium');
		});

		it('should return "medium" for capacity of 49', () => {
			expect(calculateEventSize(49)).toBe('medium');
		});
	});

	describe('large size (50+)', () => {
		it('should return "large" for capacity of 50', () => {
			expect(calculateEventSize(50)).toBe('large');
		});

		it('should return "large" for capacity of 100', () => {
			expect(calculateEventSize(100)).toBe('large');
		});

		it('should return "large" for capacity of 1000', () => {
			expect(calculateEventSize(1000)).toBe('large');
		});

		it('should return "large" for maximum capacity of 10000', () => {
			expect(calculateEventSize(10000)).toBe('large');
		});
	});

	describe('edge cases', () => {
		it('should return null for null capacity', () => {
			expect(calculateEventSize(null)).toBeNull();
		});

		it('should return null for undefined capacity', () => {
			expect(calculateEventSize(undefined)).toBeNull();
		});
	});

	describe('boundary validation', () => {
		it('should handle boundary between intimate and small (9 vs 10)', () => {
			expect(calculateEventSize(9)).toBe('intimate');
			expect(calculateEventSize(10)).toBe('small');
		});

		it('should handle boundary between small and medium (19 vs 20)', () => {
			expect(calculateEventSize(19)).toBe('small');
			expect(calculateEventSize(20)).toBe('medium');
		});

		it('should handle boundary between medium and large (49 vs 50)', () => {
			expect(calculateEventSize(49)).toBe('medium');
			expect(calculateEventSize(50)).toBe('large');
		});
	});
});

describe('getEventSizeLabel', () => {
	it('should return "Intimate" for intimate size', () => {
		expect(getEventSizeLabel('intimate')).toBe('Intimate');
	});

	it('should return "Small" for small size', () => {
		expect(getEventSizeLabel('small')).toBe('Small');
	});

	it('should return "Medium" for medium size', () => {
		expect(getEventSizeLabel('medium')).toBe('Medium');
	});

	it('should return "Large" for large size', () => {
		expect(getEventSizeLabel('large')).toBe('Large');
	});

	it('should return null for null size', () => {
		expect(getEventSizeLabel(null)).toBeNull();
	});

	it('should return null for undefined size', () => {
		expect(getEventSizeLabel(undefined)).toBeNull();
	});
});

describe('getEventSizeDescription', () => {
	it('should return welcoming description for intimate size', () => {
		const description = getEventSizeDescription('intimate');
		expect(description).toBeTruthy();
		expect(description).toContain('Under 10');
		expect(description?.toLowerCase()).toContain('deep conversations');
	});

	it('should return welcoming description for small size', () => {
		const description = getEventSizeDescription('small');
		expect(description).toBeTruthy();
		expect(description).toContain('10-20');
		expect(description?.toLowerCase()).toContain('welcoming');
	});

	it('should return positive description for medium size', () => {
		const description = getEventSizeDescription('medium');
		expect(description).toBeTruthy();
		expect(description).toContain('20-50');
		expect(description?.toLowerCase()).toContain('connection');
	});

	it('should return positive description for large size', () => {
		const description = getEventSizeDescription('large');
		expect(description).toBeTruthy();
		expect(description).toContain('50+');
		expect(description?.toLowerCase()).toContain('vibrant');
	});

	it('should return null for null size', () => {
		expect(getEventSizeDescription(null)).toBeNull();
	});

	it('should return null for undefined size', () => {
		expect(getEventSizeDescription(undefined)).toBeNull();
	});

	it('should position small events as welcoming, not lesser', () => {
		const intimateDesc = getEventSizeDescription('intimate');
		const smallDesc = getEventSizeDescription('small');

		// Check that descriptions are positive, not apologetic
		expect(intimateDesc?.toLowerCase()).not.toContain('only');
		expect(intimateDesc?.toLowerCase()).not.toContain('just');
		expect(smallDesc?.toLowerCase()).not.toContain('only');
		expect(smallDesc?.toLowerCase()).not.toContain('just');

		// Check for positive framing
		expect(intimateDesc?.toLowerCase()).toMatch(/perfect|great|ideal|deep/);
		expect(smallDesc?.toLowerCase()).toMatch(/cozy|welcoming|comfortable/);
	});
});

describe('getEventSizeCapacityRange', () => {
	it('should return "Under 10" for intimate size', () => {
		expect(getEventSizeCapacityRange('intimate')).toBe('Under 10');
	});

	it('should return "10-20" for small size', () => {
		expect(getEventSizeCapacityRange('small')).toBe('10-20');
	});

	it('should return "20-50" for medium size', () => {
		expect(getEventSizeCapacityRange('medium')).toBe('20-50');
	});

	it('should return "50+" for large size', () => {
		expect(getEventSizeCapacityRange('large')).toBe('50+');
	});
});

describe('integration tests', () => {
	it('should correctly calculate and label size from capacity', () => {
		const capacity = 15;
		const size = calculateEventSize(capacity);
		expect(size).toBe('small');

		const label = getEventSizeLabel(size);
		expect(label).toBe('Small');

		const description = getEventSizeDescription(size);
		expect(description).toContain('10-20');
	});

	it('should handle full workflow for intimate event', () => {
		const capacity = 8;
		const size = calculateEventSize(capacity);
		const label = getEventSizeLabel(size);
		const description = getEventSizeDescription(size);
		const range = getEventSizeCapacityRange(size as EventSize);

		expect(size).toBe('intimate');
		expect(label).toBe('Intimate');
		expect(description).toContain('Under 10');
		expect(range).toBe('Under 10');
	});

	it('should handle full workflow for large event', () => {
		const capacity = 200;
		const size = calculateEventSize(capacity);
		const label = getEventSizeLabel(size);
		const description = getEventSizeDescription(size);
		const range = getEventSizeCapacityRange(size as EventSize);

		expect(size).toBe('large');
		expect(label).toBe('Large');
		expect(description).toContain('50+');
		expect(range).toBe('50+');
	});

	it('should handle events with no capacity (unlimited)', () => {
		const size = calculateEventSize(null);
		const label = getEventSizeLabel(size);
		const description = getEventSizeDescription(size);

		expect(size).toBeNull();
		expect(label).toBeNull();
		expect(description).toBeNull();
	});
});
