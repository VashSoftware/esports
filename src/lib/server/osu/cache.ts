// src/lib/server/osu/cache.ts
//
// In-memory cache for osu! beatmap metadata.
// Beatmap data is essentially immutable, so we use a long TTL (2 hours)
// and return stale entries on fetch failure to prevent "?" in the UI.

interface CacheEntry<T> {
	data: T;
	expiresAt: number;
}

const CACHE_TTL = 2 * 60 * 60 * 1000; // 2 hours (beatmap data rarely changes)
const MAX_ENTRIES = 500;

const cache = new Map<string, CacheEntry<any>>();

export function getCached<T>(key: string): T | null {
	const entry = cache.get(key);
	if (!entry) return null;
	if (Date.now() > entry.expiresAt) {
		// Expired — don't delete yet, keep as stale fallback
		return null;
	}
	return entry.data as T;
}

/**
 * Return stale (expired) data for a key if it exists.
 * Used as a fallback when the osu! API fails, so the UI doesn't lose data.
 */
export function getStale<T>(key: string): T | null {
	const entry = cache.get(key);
	if (!entry) return null;
	return entry.data as T;
}

export function setCache<T>(key: string, data: T, ttl = CACHE_TTL): void {
	// Evict oldest entries if at capacity
	if (cache.size >= MAX_ENTRIES) {
		const firstKey = cache.keys().next().value;
		if (firstKey) cache.delete(firstKey);
	}
	cache.set(key, { data, expiresAt: Date.now() + ttl });
}

export function invalidateCache(key: string): void {
	cache.delete(key);
}

export function clearCache(): void {
	cache.clear();
}
