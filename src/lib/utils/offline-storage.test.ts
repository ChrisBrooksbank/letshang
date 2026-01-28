import { describe, it, expect, beforeEach, vi } from 'vitest';

// Types from the module under test
type CachedUserProfile = {
	userId: string;
	displayName: string | null;
	bio: string | null;
	profilePhotoUrl: string | null;
	location: string | null;
	profileVisibility: 'public' | 'members_only' | 'connections_only';
	cachedAt: number;
};

type CachedGroup = {
	groupId: string;
	name: string;
	description: string | null;
	coverImageUrl: string | null;
	groupType: 'public' | 'private';
	role: string;
	memberCount: number;
	cachedAt: number;
};

type CachedEvent = {
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
};

/**
 * In-memory store that mimics IDBPObjectStore behavior.
 */
class MockStore {
	private data: Map<string, any> = new Map();

	async put(value: any, key: string) {
		this.data.set(key, value);
	}
	async get(key: string) {
		return this.data.get(key) ?? undefined;
	}
	async delete(key: string) {
		this.data.delete(key);
	}
	async getAll() {
		return Array.from(this.data.values());
	}
	async clear() {
		this.data.clear();
	}
}

class MockTransaction {
	store: MockStore;
	done: Promise<void>;

	constructor(store: MockStore) {
		this.store = store;
		this.done = Promise.resolve();
	}
}

/**
 * Persistent mock DB shared across all tests.
 * Each test resets state via clearAllCache() in beforeEach.
 */
const mockStores = new Map<string, MockStore>([
	['user-profile', new MockStore()],
	['joined-groups', new MockStore()],
	['rsvped-events', new MockStore()]
]);

const mockDB = {
	async put(storeName: string, value: any, key: string) {
		const store = mockStores.get(storeName);
		if (store) await store.put(value, key);
	},
	async get(storeName: string, key: string) {
		const store = mockStores.get(storeName);
		return store ? await store.get(key) : undefined;
	},
	async getAll(storeName: string) {
		const store = mockStores.get(storeName);
		return store ? await store.getAll() : [];
	},
	async delete(storeName: string, key: string) {
		const store = mockStores.get(storeName);
		if (store) await store.delete(key);
	},
	async clear(storeName: string) {
		const store = mockStores.get(storeName);
		if (store) await store.clear();
	},
	transaction(storeName: string, _mode: string) {
		const store = mockStores.get(storeName)!;
		return new MockTransaction(store);
	}
};

vi.mock('idb', () => ({
	openDB: () => Promise.resolve(mockDB)
}));

import {
	cacheUserProfile,
	getCachedUserProfile,
	cacheJoinedGroups,
	getCachedGroups,
	cacheRsvpedEvents,
	getCachedEvents,
	clearAllCache,
	getDB
} from './offline-storage';

/** Sample data fixtures */
const sampleProfile: Omit<CachedUserProfile, 'cachedAt'> = {
	userId: 'user-1',
	displayName: 'Jane Doe',
	bio: 'Love community events',
	profilePhotoUrl: 'https://example.com/photo.jpg',
	location: 'San Francisco',
	profileVisibility: 'members_only'
};

const sampleGroup: Omit<CachedGroup, 'cachedAt'> = {
	groupId: 'group-1',
	name: 'SF Tech Meetups',
	description: 'Weekly tech meetups in SF',
	coverImageUrl: 'https://example.com/cover.jpg',
	groupType: 'public',
	role: 'member',
	memberCount: 42
};

const sampleEvent: Omit<CachedEvent, 'cachedAt'> = {
	eventId: 'event-1',
	title: 'TypeScript Workshop',
	description: 'Deep dive into TypeScript',
	startTime: '2026-02-15T18:00:00Z',
	endTime: '2026-02-15T20:00:00Z',
	eventType: 'in_person',
	venueName: 'Tech Hub',
	venueAddress: '123 Main St, SF',
	rsvpStatus: 'going',
	groupId: 'group-1'
};

beforeEach(async () => {
	// Clear all stores to start each test fresh
	for (const store of mockStores.values()) {
		await store.clear();
	}
});

describe('getDB', () => {
	it('returns a database instance', async () => {
		const db = await getDB();
		expect(db).toBeDefined();
	});
});

describe('User Profile Cache', () => {
	it('caches and retrieves a user profile', async () => {
		await cacheUserProfile(sampleProfile);
		const result = await getCachedUserProfile('user-1');

		expect(result).not.toBeNull();
		expect(result!.userId).toBe('user-1');
		expect(result!.displayName).toBe('Jane Doe');
		expect(result!.bio).toBe('Love community events');
		expect(result!.profilePhotoUrl).toBe('https://example.com/photo.jpg');
		expect(result!.location).toBe('San Francisco');
		expect(result!.profileVisibility).toBe('members_only');
	});

	it('sets cachedAt timestamp on save', async () => {
		const before = Date.now();
		await cacheUserProfile(sampleProfile);
		const after = Date.now();
		const result = await getCachedUserProfile('user-1');

		expect(result!.cachedAt).toBeGreaterThanOrEqual(before);
		expect(result!.cachedAt).toBeLessThanOrEqual(after);
	});

	it('returns null for unknown user', async () => {
		const result = await getCachedUserProfile('unknown-id');
		expect(result).toBeNull();
	});

	it('returns null and deletes expired profile', async () => {
		const db = await getDB();
		const expired: CachedUserProfile = {
			...sampleProfile,
			cachedAt: Date.now() - 25 * 60 * 60 * 1000 // 25 hours ago
		};
		await db.put('user-profile', expired, 'user-1');

		const result = await getCachedUserProfile('user-1');
		expect(result).toBeNull();

		// Verify it was deleted
		const afterDelete = await db.get('user-profile', 'user-1');
		expect(afterDelete).toBeUndefined();
	});

	it('overwrites existing profile on re-cache', async () => {
		await cacheUserProfile(sampleProfile);
		await cacheUserProfile({ ...sampleProfile, displayName: 'Updated Name' });

		const result = await getCachedUserProfile('user-1');
		expect(result!.displayName).toBe('Updated Name');
	});
});

describe('Joined Groups Cache', () => {
	it('caches and retrieves joined groups', async () => {
		await cacheJoinedGroups([sampleGroup]);
		const result = await getCachedGroups();

		expect(result).toHaveLength(1);
		expect(result[0].groupId).toBe('group-1');
		expect(result[0].name).toBe('SF Tech Meetups');
		expect(result[0].memberCount).toBe(42);
	});

	it('caches multiple groups', async () => {
		const group2: Omit<CachedGroup, 'cachedAt'> = {
			...sampleGroup,
			groupId: 'group-2',
			name: 'Bay Area Hikers'
		};
		await cacheJoinedGroups([sampleGroup, group2]);
		const result = await getCachedGroups();

		expect(result).toHaveLength(2);
		expect(result.map((g) => g.groupId).sort()).toEqual(['group-1', 'group-2']);
	});

	it('clears previous groups before caching new snapshot', async () => {
		await cacheJoinedGroups([sampleGroup]);
		const group2: Omit<CachedGroup, 'cachedAt'> = {
			...sampleGroup,
			groupId: 'group-2',
			name: 'Only Group Left'
		};
		await cacheJoinedGroups([group2]);

		const result = await getCachedGroups();
		expect(result).toHaveLength(1);
		expect(result[0].groupId).toBe('group-2');
	});

	it('returns empty array when no groups cached', async () => {
		const result = await getCachedGroups();
		expect(result).toHaveLength(0);
	});

	it('filters out expired groups and cleans up', async () => {
		const db = await getDB();
		const tx = db.transaction('joined-groups', 'readwrite');
		await tx.store.put({ ...sampleGroup, groupId: 'fresh-1', cachedAt: Date.now() }, 'fresh-1');
		await tx.store.put(
			{
				...sampleGroup,
				groupId: 'stale-1',
				cachedAt: Date.now() - 13 * 60 * 60 * 1000 // 13 hours ago
			},
			'stale-1'
		);
		await tx.done;

		const result = await getCachedGroups();
		expect(result).toHaveLength(1);
		expect(result[0].groupId).toBe('fresh-1');

		// Stale entry should have been deleted
		const allEntries = await db.getAll('joined-groups');
		expect(allEntries).toHaveLength(1);
	});

	it('sets cachedAt timestamp on each group', async () => {
		const before = Date.now();
		await cacheJoinedGroups([sampleGroup]);
		const after = Date.now();

		const result = await getCachedGroups();
		expect(result[0].cachedAt).toBeGreaterThanOrEqual(before);
		expect(result[0].cachedAt).toBeLessThanOrEqual(after);
	});

	it('caches empty group list (clears store)', async () => {
		await cacheJoinedGroups([sampleGroup]);
		await cacheJoinedGroups([]);

		const result = await getCachedGroups();
		expect(result).toHaveLength(0);
	});
});

describe('RSVPed Events Cache', () => {
	it('caches and retrieves RSVPed events', async () => {
		await cacheRsvpedEvents([sampleEvent]);
		const result = await getCachedEvents();

		expect(result).toHaveLength(1);
		expect(result[0].eventId).toBe('event-1');
		expect(result[0].title).toBe('TypeScript Workshop');
		expect(result[0].rsvpStatus).toBe('going');
	});

	it('caches multiple events', async () => {
		const event2: Omit<CachedEvent, 'cachedAt'> = {
			...sampleEvent,
			eventId: 'event-2',
			title: 'React Conf',
			rsvpStatus: 'interested'
		};
		await cacheRsvpedEvents([sampleEvent, event2]);
		const result = await getCachedEvents();

		expect(result).toHaveLength(2);
		expect(result.map((e) => e.eventId).sort()).toEqual(['event-1', 'event-2']);
	});

	it('replaces previous events on new snapshot', async () => {
		await cacheRsvpedEvents([sampleEvent]);
		const event2: Omit<CachedEvent, 'cachedAt'> = {
			...sampleEvent,
			eventId: 'event-3',
			title: 'Design Patterns'
		};
		await cacheRsvpedEvents([event2]);

		const result = await getCachedEvents();
		expect(result).toHaveLength(1);
		expect(result[0].eventId).toBe('event-3');
	});

	it('returns empty array when no events cached', async () => {
		const result = await getCachedEvents();
		expect(result).toHaveLength(0);
	});

	it('filters out expired events and cleans up', async () => {
		const db = await getDB();
		const tx = db.transaction('rsvped-events', 'readwrite');
		await tx.store.put(
			{ ...sampleEvent, eventId: 'fresh-event', cachedAt: Date.now() },
			'fresh-event'
		);
		await tx.store.put(
			{
				...sampleEvent,
				eventId: 'stale-event',
				cachedAt: Date.now() - 7 * 60 * 60 * 1000 // 7 hours ago
			},
			'stale-event'
		);
		await tx.done;

		const result = await getCachedEvents();
		expect(result).toHaveLength(1);
		expect(result[0].eventId).toBe('fresh-event');

		// Stale entry should be deleted
		const allEntries = await db.getAll('rsvped-events');
		expect(allEntries).toHaveLength(1);
	});

	it('handles online event type', async () => {
		const onlineEvent: Omit<CachedEvent, 'cachedAt'> = {
			...sampleEvent,
			eventId: 'online-1',
			eventType: 'online',
			venueName: null,
			venueAddress: null
		};
		await cacheRsvpedEvents([onlineEvent]);

		const result = await getCachedEvents();
		expect(result[0].eventType).toBe('online');
		expect(result[0].venueName).toBeNull();
	});

	it('handles hybrid event type', async () => {
		const hybridEvent: Omit<CachedEvent, 'cachedAt'> = {
			...sampleEvent,
			eventId: 'hybrid-1',
			eventType: 'hybrid'
		};
		await cacheRsvpedEvents([hybridEvent]);

		const result = await getCachedEvents();
		expect(result[0].eventType).toBe('hybrid');
	});

	it('handles events without a group', async () => {
		const standaloneEvent: Omit<CachedEvent, 'cachedAt'> = {
			...sampleEvent,
			eventId: 'standalone-1',
			groupId: null
		};
		await cacheRsvpedEvents([standaloneEvent]);

		const result = await getCachedEvents();
		expect(result[0].groupId).toBeNull();
	});

	it('caches events with all RSVP statuses', async () => {
		const events: Array<Omit<CachedEvent, 'cachedAt'>> = [
			{ ...sampleEvent, eventId: 'e-going', rsvpStatus: 'going' },
			{ ...sampleEvent, eventId: 'e-interested', rsvpStatus: 'interested' },
			{ ...sampleEvent, eventId: 'e-not-going', rsvpStatus: 'not_going' }
		];
		await cacheRsvpedEvents(events);

		const result = await getCachedEvents();
		const statuses = result.map((e) => e.rsvpStatus).sort();
		expect(statuses).toEqual(['going', 'interested', 'not_going']);
	});
});

describe('clearAllCache', () => {
	it('clears user profile cache', async () => {
		await cacheUserProfile(sampleProfile);
		await clearAllCache();

		const result = await getCachedUserProfile('user-1');
		expect(result).toBeNull();
	});

	it('clears joined groups cache', async () => {
		await cacheJoinedGroups([sampleGroup]);
		await clearAllCache();

		const result = await getCachedGroups();
		expect(result).toHaveLength(0);
	});

	it('clears RSVPed events cache', async () => {
		await cacheRsvpedEvents([sampleEvent]);
		await clearAllCache();

		const result = await getCachedEvents();
		expect(result).toHaveLength(0);
	});

	it('clears all stores simultaneously', async () => {
		await cacheUserProfile(sampleProfile);
		await cacheJoinedGroups([sampleGroup]);
		await cacheRsvpedEvents([sampleEvent]);

		await clearAllCache();

		const profile = await getCachedUserProfile('user-1');
		const groups = await getCachedGroups();
		const events = await getCachedEvents();

		expect(profile).toBeNull();
		expect(groups).toHaveLength(0);
		expect(events).toHaveLength(0);
	});
});

describe('Edge cases', () => {
	it('handles profile with all null optional fields', async () => {
		const minimal: Omit<CachedUserProfile, 'cachedAt'> = {
			userId: 'minimal-user',
			displayName: null,
			bio: null,
			profilePhotoUrl: null,
			location: null,
			profileVisibility: 'public'
		};
		await cacheUserProfile(minimal);

		const result = await getCachedUserProfile('minimal-user');
		expect(result!.displayName).toBeNull();
		expect(result!.bio).toBeNull();
		expect(result!.location).toBeNull();
	});

	it('handles event with all null optional fields', async () => {
		const minimal: Omit<CachedEvent, 'cachedAt'> = {
			eventId: 'minimal-event',
			title: 'Quick Chat',
			description: null,
			startTime: '2026-03-01T10:00:00Z',
			endTime: null,
			eventType: 'online',
			venueName: null,
			venueAddress: null,
			rsvpStatus: 'interested',
			groupId: null
		};
		await cacheRsvpedEvents([minimal]);

		const result = await getCachedEvents();
		expect(result[0].description).toBeNull();
		expect(result[0].endTime).toBeNull();
		expect(result[0].venueName).toBeNull();
	});

	it('handles group with null optional fields', async () => {
		const minimal: Omit<CachedGroup, 'cachedAt'> = {
			groupId: 'minimal-group',
			name: 'Basic Group',
			description: null,
			coverImageUrl: null,
			groupType: 'private',
			role: 'organizer',
			memberCount: 1
		};
		await cacheJoinedGroups([minimal]);

		const result = await getCachedGroups();
		expect(result[0].description).toBeNull();
		expect(result[0].coverImageUrl).toBeNull();
	});

	it('caches large number of groups efficiently', async () => {
		const groups: Array<Omit<CachedGroup, 'cachedAt'>> = Array.from({ length: 50 }, (_, i) => ({
			...sampleGroup,
			groupId: `group-${i}`,
			name: `Group ${i}`
		}));

		await cacheJoinedGroups(groups);
		const result = await getCachedGroups();
		expect(result).toHaveLength(50);
	});

	it('caches large number of events efficiently', async () => {
		const events: Array<Omit<CachedEvent, 'cachedAt'>> = Array.from({ length: 100 }, (_, i) => ({
			...sampleEvent,
			eventId: `event-${i}`,
			title: `Event ${i}`
		}));

		await cacheRsvpedEvents(events);
		const result = await getCachedEvents();
		expect(result).toHaveLength(100);
	});
});
