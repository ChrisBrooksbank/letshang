import { describe, it, expect } from 'vitest';
import {
	updateMemberRoleSchema,
	removeMemberSchema,
	canAssignRole,
	canModifyMember,
	getAssignableRoles,
	ROLE_HIERARCHY,
	ROLE_DISPLAY_NAMES,
	ROLE_DESCRIPTIONS,
	type GroupMemberRole
} from './group-members';

describe('group-members schemas', () => {
	describe('updateMemberRoleSchema', () => {
		it('should accept valid role update data', () => {
			const input = {
				memberId: '123e4567-e89b-12d3-a456-426614174000',
				newRole: 'co_organizer' as const
			};

			const result = updateMemberRoleSchema.safeParse(input);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data).toEqual(input);
			}
		});

		it('should reject invalid UUID', () => {
			const input = {
				memberId: 'not-a-uuid',
				newRole: 'member' as const
			};

			const result = updateMemberRoleSchema.safeParse(input);
			expect(result.success).toBe(false);
		});

		it('should reject invalid role', () => {
			const input = {
				memberId: '123e4567-e89b-12d3-a456-426614174000',
				newRole: 'super_admin'
			};

			const result = updateMemberRoleSchema.safeParse(input);
			expect(result.success).toBe(false);
		});

		it('should reject missing fields', () => {
			const result = updateMemberRoleSchema.safeParse({});
			expect(result.success).toBe(false);
		});

		it('should accept all valid roles', () => {
			const roles: GroupMemberRole[] = [
				'organizer',
				'co_organizer',
				'assistant_organizer',
				'event_organizer',
				'member'
			];

			roles.forEach((role) => {
				const result = updateMemberRoleSchema.safeParse({
					memberId: '123e4567-e89b-12d3-a456-426614174000',
					newRole: role
				});
				expect(result.success).toBe(true);
			});
		});
	});

	describe('removeMemberSchema', () => {
		it('should accept valid member ID', () => {
			const input = {
				memberId: '123e4567-e89b-12d3-a456-426614174000'
			};

			const result = removeMemberSchema.safeParse(input);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data).toEqual(input);
			}
		});

		it('should reject invalid UUID', () => {
			const result = removeMemberSchema.safeParse({ memberId: 'invalid' });
			expect(result.success).toBe(false);
		});

		it('should reject missing member ID', () => {
			const result = removeMemberSchema.safeParse({});
			expect(result.success).toBe(false);
		});
	});

	describe('canAssignRole', () => {
		it('should allow organizer to assign any role', () => {
			const roles: GroupMemberRole[] = [
				'organizer',
				'co_organizer',
				'assistant_organizer',
				'event_organizer',
				'member'
			];

			roles.forEach((role) => {
				expect(canAssignRole('organizer', role)).toBe(true);
			});
		});

		it('should allow co-organizer to assign roles at or below their level', () => {
			expect(canAssignRole('co_organizer', 'organizer')).toBe(false);
			expect(canAssignRole('co_organizer', 'co_organizer')).toBe(true);
			expect(canAssignRole('co_organizer', 'assistant_organizer')).toBe(true);
			expect(canAssignRole('co_organizer', 'event_organizer')).toBe(true);
			expect(canAssignRole('co_organizer', 'member')).toBe(true);
		});

		it('should allow assistant organizer to assign appropriate roles', () => {
			expect(canAssignRole('assistant_organizer', 'organizer')).toBe(false);
			expect(canAssignRole('assistant_organizer', 'co_organizer')).toBe(false);
			expect(canAssignRole('assistant_organizer', 'assistant_organizer')).toBe(true);
			expect(canAssignRole('assistant_organizer', 'event_organizer')).toBe(true);
			expect(canAssignRole('assistant_organizer', 'member')).toBe(true);
		});

		it('should prevent event organizer from assigning leadership roles', () => {
			expect(canAssignRole('event_organizer', 'organizer')).toBe(false);
			expect(canAssignRole('event_organizer', 'co_organizer')).toBe(false);
			expect(canAssignRole('event_organizer', 'assistant_organizer')).toBe(false);
			expect(canAssignRole('event_organizer', 'event_organizer')).toBe(true);
			expect(canAssignRole('event_organizer', 'member')).toBe(true);
		});

		it('should prevent regular members from assigning roles', () => {
			expect(canAssignRole('member', 'organizer')).toBe(false);
			expect(canAssignRole('member', 'co_organizer')).toBe(false);
			expect(canAssignRole('member', 'assistant_organizer')).toBe(false);
			expect(canAssignRole('member', 'event_organizer')).toBe(false);
			expect(canAssignRole('member', 'member')).toBe(true);
		});
	});

	describe('canModifyMember', () => {
		it('should allow organizer to modify all lower roles', () => {
			expect(canModifyMember('organizer', 'organizer')).toBe(false); // Cannot modify peers
			expect(canModifyMember('organizer', 'co_organizer')).toBe(true);
			expect(canModifyMember('organizer', 'assistant_organizer')).toBe(true);
			expect(canModifyMember('organizer', 'event_organizer')).toBe(true);
			expect(canModifyMember('organizer', 'member')).toBe(true);
		});

		it('should allow co-organizer to modify lower roles only', () => {
			expect(canModifyMember('co_organizer', 'organizer')).toBe(false);
			expect(canModifyMember('co_organizer', 'co_organizer')).toBe(false); // Cannot modify peers
			expect(canModifyMember('co_organizer', 'assistant_organizer')).toBe(true);
			expect(canModifyMember('co_organizer', 'event_organizer')).toBe(true);
			expect(canModifyMember('co_organizer', 'member')).toBe(true);
		});

		it('should prevent modifying equal or higher roles', () => {
			expect(canModifyMember('assistant_organizer', 'organizer')).toBe(false);
			expect(canModifyMember('assistant_organizer', 'co_organizer')).toBe(false);
			expect(canModifyMember('assistant_organizer', 'assistant_organizer')).toBe(false);
			expect(canModifyMember('event_organizer', 'event_organizer')).toBe(false);
			expect(canModifyMember('member', 'member')).toBe(false);
		});

		it('should allow assistant organizer to modify event organizers and members', () => {
			expect(canModifyMember('assistant_organizer', 'event_organizer')).toBe(true);
			expect(canModifyMember('assistant_organizer', 'member')).toBe(true);
		});

		it('should allow event organizer to modify members only', () => {
			expect(canModifyMember('event_organizer', 'member')).toBe(true);
			expect(canModifyMember('event_organizer', 'event_organizer')).toBe(false);
		});

		it('should prevent members from modifying anyone', () => {
			const roles: GroupMemberRole[] = [
				'organizer',
				'co_organizer',
				'assistant_organizer',
				'event_organizer',
				'member'
			];

			roles.forEach((role) => {
				expect(canModifyMember('member', role)).toBe(false);
			});
		});
	});

	describe('getAssignableRoles', () => {
		it('should return all roles for organizer', () => {
			const roles = getAssignableRoles('organizer');
			expect(roles).toEqual([
				'organizer',
				'co_organizer',
				'assistant_organizer',
				'event_organizer',
				'member'
			]);
		});

		it('should return roles excluding organizer for co-organizer', () => {
			const roles = getAssignableRoles('co_organizer');
			expect(roles).toEqual(['co_organizer', 'assistant_organizer', 'event_organizer', 'member']);
			expect(roles).not.toContain('organizer');
		});

		it('should return limited roles for assistant organizer', () => {
			const roles = getAssignableRoles('assistant_organizer');
			expect(roles).toEqual(['assistant_organizer', 'event_organizer', 'member']);
			expect(roles).not.toContain('organizer');
			expect(roles).not.toContain('co_organizer');
		});

		it('should return minimal roles for event organizer', () => {
			const roles = getAssignableRoles('event_organizer');
			expect(roles).toEqual(['event_organizer', 'member']);
		});

		it('should return only member role for regular members', () => {
			const roles = getAssignableRoles('member');
			expect(roles).toEqual(['member']);
		});
	});

	describe('role constants', () => {
		it('should have correct role hierarchy values', () => {
			expect(ROLE_HIERARCHY.organizer).toBeGreaterThan(ROLE_HIERARCHY.co_organizer);
			expect(ROLE_HIERARCHY.co_organizer).toBeGreaterThan(ROLE_HIERARCHY.assistant_organizer);
			expect(ROLE_HIERARCHY.assistant_organizer).toBeGreaterThan(ROLE_HIERARCHY.event_organizer);
			expect(ROLE_HIERARCHY.event_organizer).toBeGreaterThan(ROLE_HIERARCHY.member);
			expect(ROLE_HIERARCHY.member).toBe(0);
		});

		it('should have display names for all roles', () => {
			const roles: GroupMemberRole[] = [
				'organizer',
				'co_organizer',
				'assistant_organizer',
				'event_organizer',
				'member'
			];

			roles.forEach((role) => {
				expect(ROLE_DISPLAY_NAMES[role]).toBeDefined();
				expect(typeof ROLE_DISPLAY_NAMES[role]).toBe('string');
				expect(ROLE_DISPLAY_NAMES[role].length).toBeGreaterThan(0);
			});
		});

		it('should have descriptions for all roles', () => {
			const roles: GroupMemberRole[] = [
				'organizer',
				'co_organizer',
				'assistant_organizer',
				'event_organizer',
				'member'
			];

			roles.forEach((role) => {
				expect(ROLE_DESCRIPTIONS[role]).toBeDefined();
				expect(typeof ROLE_DESCRIPTIONS[role]).toBe('string');
				expect(ROLE_DESCRIPTIONS[role].length).toBeGreaterThan(0);
			});
		});
	});
});
