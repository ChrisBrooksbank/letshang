/**
 * Offline data storage using IndexedDB via the idb library.
 *
 * Caches user data, joined groups, and upcoming RSVPed events
 * so the app can display meaningful content while offline.
 *
 * Cache strategy:
 * - User profile: updated on every load, TTL 24 hours
 * - Joined groups: updated on every load, TTL 12 hours
 * - RSVPed events: updated on every load, TTL 6 hours
 */

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

const DB_NAME = 'letshang-offline';
const DB_VERSION = 1;

/** Time-to-live durations in milliseconds */
const TTL_USER_PROFILE = 60 * 60 * 24 * 1000; // 24 hours
const TTL_JOINED_GROUPS = 60 * 60 * 12 * 1000; // 12 hours
const TTL_RSVPED_EVENTS = 60 * 60 * 6 * 1000; // 6 hours

/** Cached user profile record */
export interface CachedUserProfile {
	userId: string;
	displayName: string | null;
	bio: string | null;
	profilePhotoUrl: string | null;
	location: string | null;
	profileVisibility: 'public' | 'members_only' | 'connections_only';
	cachedAt: number;
}

/** Cached group record */
export interface CachedGroup {
	groupId: string;
	name: string;
	description: string | null;
	coverImageUrl: string | null;
	groupType: 'public' | 'private';
	role: string;
	memberCount: number;
	cachedAt: number;
}

/** Cached event with RSVP status */
export interface CachedEvent {
	eventId: string;
	title: string;
	description: string | null;
	startTime: string;
	endTime: string | null;
	eventType: 'in_person' | 'online' | 'hybrid';
	venueName: string | null;
	venueAddress: string | null;
	rsvpStatus: 'going' | 'interested' | 'not_going';
	groupId: string | null;
	cachedAt: number;
}

/** IndexedDB schema definition */
interface OfflineDBSchema extends DBSchema {
	'user-profile': {
		key: string;
		value: CachedUserProfile;
	};
	'joined-groups': {
		key: string;
		value: CachedGroup;
	};
	'rsvped-events': {
		key: string;
		value: CachedEvent;
	};
}

let db: IDBPDatabase<OfflineDBSchema> | null = null;

/**
 * Open or return the cached IndexedDB connection.
 * Throws if IndexedDB is not available (e.g., during SSR).
 */
export async function getDB(): Promise<IDBPDatabase<OfflineDBSchema>> {
	if (db) return db;

	db = await openDB<OfflineDBSchema>(DB_NAME, DB_VERSION, {
		upgrade(database) {
			if (!database.objectStoreNames.contains('user-profile')) {
				database.createObjectStore('user-profile');
			}
			if (!database.objectStoreNames.contains('joined-groups')) {
				database.createObjectStore('joined-groups');
			}
			if (!database.objectStoreNames.contains('rsvped-events')) {
				database.createObjectStore('rsvped-events');
			}
		}
	});

	return db;
}

/**
 * Check whether an entry is still within its TTL window.
 */
function isFresh(cachedAt: number, ttl: number): boolean {
	return Date.now() - cachedAt < ttl;
}

// --- User Profile ---

/**
 * Save the authenticated user's profile to the offline cache.
 */
export async function cacheUserProfile(
	profile: Omit<CachedUserProfile, 'cachedAt'>
): Promise<void> {
	const database = await getDB();
	const entry: CachedUserProfile = { ...profile, cachedAt: Date.now() };
	await database.put('user-profile', entry, profile.userId);
}

/**
 * Retrieve the cached user profile if still fresh.
 * Returns null when the cache is empty or expired.
 */
export async function getCachedUserProfile(userId: string): Promise<CachedUserProfile | null> {
	const database = await getDB();
	const entry = await database.get('user-profile', userId);
	if (!entry) return null;
	if (!isFresh(entry.cachedAt, TTL_USER_PROFILE)) {
		await database.delete('user-profile', userId);
		return null;
	}
	return entry;
}

// --- Joined Groups ---

/**
 * Replace all cached groups with a fresh snapshot.
 * Clears the store first so stale groups (e.g., after leaving) are removed.
 */
export async function cacheJoinedGroups(
	groups: Array<Omit<CachedGroup, 'cachedAt'>>
): Promise<void> {
	const database = await getDB();
	const tx = database.transaction('joined-groups', 'readwrite');
	await tx.store.clear();
	const now = Date.now();
	for (const group of groups) {
		await tx.store.put({ ...group, cachedAt: now }, group.groupId);
	}
	await tx.done;
}

/**
 * Retrieve all cached groups that are still fresh.
 */
export async function getCachedGroups(): Promise<CachedGroup[]> {
	const database = await getDB();
	const entries = await database.getAll('joined-groups');
	const fresh = entries.filter((entry) => isFresh(entry.cachedAt, TTL_JOINED_GROUPS));
	if (fresh.length !== entries.length) {
		// Some entries expired — clean up stale ones in background
		const tx = database.transaction('joined-groups', 'readwrite');
		for (const entry of entries) {
			if (!isFresh(entry.cachedAt, TTL_JOINED_GROUPS)) {
				await tx.store.delete(entry.groupId);
			}
		}
		await tx.done;
	}
	return fresh;
}

// --- RSVPed Events ---

/**
 * Replace all cached events with a fresh snapshot.
 * Clears the store first so past or cancelled events are removed.
 */
export async function cacheRsvpedEvents(
	events: Array<Omit<CachedEvent, 'cachedAt'>>
): Promise<void> {
	const database = await getDB();
	const tx = database.transaction('rsvped-events', 'readwrite');
	await tx.store.clear();
	const now = Date.now();
	for (const event of events) {
		await tx.store.put({ ...event, cachedAt: now }, event.eventId);
	}
	await tx.done;
}

/**
 * Retrieve all cached events that are still fresh.
 */
export async function getCachedEvents(): Promise<CachedEvent[]> {
	const database = await getDB();
	const entries = await database.getAll('rsvped-events');
	const fresh = entries.filter((entry) => isFresh(entry.cachedAt, TTL_RSVPED_EVENTS));
	if (fresh.length !== entries.length) {
		const tx = database.transaction('rsvped-events', 'readwrite');
		for (const entry of entries) {
			if (!isFresh(entry.cachedAt, TTL_RSVPED_EVENTS)) {
				await tx.store.delete(entry.eventId);
			}
		}
		await tx.done;
	}
	return fresh;
}

// --- Cache management ---

/**
 * Clear all offline cached data. Useful on logout.
 */
export async function clearAllCache(): Promise<void> {
	const database = await getDB();
	await database.clear('user-profile');
	await database.clear('joined-groups');
	await database.clear('rsvped-events');
}
