/**
 * Zod schemas for messaging preference management
 */
import { z } from 'zod';

/**
 * Enum of valid DM permission levels
 */
export const dmPermissionEnum = z.enum(['anyone', 'connections', 'attendees', 'organizers']);

export type DmPermission = z.infer<typeof dmPermissionEnum>;

/**
 * Schema for updating messaging preferences
 */
export const updateMessagingPreferenceSchema = z.object({
	allowDmFrom: dmPermissionEnum
});

/**
 * Type representing a user's messaging preference
 */
export interface MessagingPreference {
	allowDmFrom: DmPermission;
}

/**
 * Labels and descriptions for each DM permission level
 */
export const DM_PERMISSION_LABELS: Record<DmPermission, { title: string; description: string }> = {
	anyone: {
		title: 'Anyone',
		description: 'Any member can send you a direct message'
	},
	connections: {
		title: 'Connections only',
		description: 'Only people you are connected with can send you messages'
	},
	attendees: {
		title: 'Event co-attendees only',
		description: 'Only people who share an event with you can send you messages'
	},
	organizers: {
		title: 'Group organizers only',
		description: 'Only organizers of groups you belong to can send you messages'
	}
};
