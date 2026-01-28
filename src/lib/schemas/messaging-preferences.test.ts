import { describe, it, expect } from 'vitest';
import {
	dmPermissionEnum,
	updateMessagingPreferenceSchema,
	DM_PERMISSION_LABELS
} from './messaging-preferences';

describe('dmPermissionEnum', () => {
	it('accepts all valid DM permission values', () => {
		const validValues = ['anyone', 'connections', 'attendees', 'organizers'];
		for (const value of validValues) {
			const result = dmPermissionEnum.safeParse(value);
			expect(result.success).toBe(true);
		}
	});

	it('rejects invalid DM permission values', () => {
		const invalidValues = ['everyone', 'nobody', 'friends', '', 'ANYONE'];
		for (const value of invalidValues) {
			const result = dmPermissionEnum.safeParse(value);
			expect(result.success).toBe(false);
		}
	});

	it('rejects non-string values', () => {
		expect(dmPermissionEnum.safeParse(123).success).toBe(false);
		expect(dmPermissionEnum.safeParse(null).success).toBe(false);
		expect(dmPermissionEnum.safeParse(undefined).success).toBe(false);
	});
});

describe('updateMessagingPreferenceSchema', () => {
	it('validates a valid messaging preference update', () => {
		const result = updateMessagingPreferenceSchema.safeParse({
			allowDmFrom: 'connections'
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.allowDmFrom).toBe('connections');
		}
	});

	it('accepts all valid permission levels', () => {
		const levels = ['anyone', 'connections', 'attendees', 'organizers'];
		for (const level of levels) {
			const result = updateMessagingPreferenceSchema.safeParse({
				allowDmFrom: level
			});
			expect(result.success).toBe(true);
		}
	});

	it('rejects invalid permission level', () => {
		const result = updateMessagingPreferenceSchema.safeParse({
			allowDmFrom: 'invalid_level'
		});
		expect(result.success).toBe(false);
	});

	it('rejects missing allowDmFrom field', () => {
		const result = updateMessagingPreferenceSchema.safeParse({});
		expect(result.success).toBe(false);
	});

	it('rejects extra fields gracefully', () => {
		const result = updateMessagingPreferenceSchema.safeParse({
			allowDmFrom: 'anyone',
			extraField: 'should be ignored'
		});
		// Zod strips extra fields by default but still passes
		expect(result.success).toBe(true);
	});
});

describe('DM_PERMISSION_LABELS', () => {
	it('has labels for all valid permission levels', () => {
		const permissionLevels = ['anyone', 'connections', 'attendees', 'organizers'];
		for (const level of permissionLevels) {
			expect(DM_PERMISSION_LABELS[level as keyof typeof DM_PERMISSION_LABELS]).toBeDefined();
		}
	});

	it('each label has a title and description', () => {
		for (const [, label] of Object.entries(DM_PERMISSION_LABELS)) {
			expect(label.title).toBeTruthy();
			expect(label.description).toBeTruthy();
			expect(typeof label.title).toBe('string');
			expect(typeof label.description).toBe('string');
		}
	});

	it('has exactly 4 permission labels', () => {
		expect(Object.keys(DM_PERMISSION_LABELS)).toHaveLength(4);
	});
});
