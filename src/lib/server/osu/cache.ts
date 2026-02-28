// src/lib/server/osu/cache.ts
//
// Simple in-memory cache for osu! beatmap metadata.
// TTL: 10 minutes. Max entries: 500.
// Avoids hammering the osu! API on every page load.

interface CacheEntry<T> {
	data: T;
	expiresAt: number;
}

const CACHE_TTL = 10 * 60 * 1000; // 10 minutes
const MAX_ENTRIES = 500;

const cache = new Map<string, CacheEntry<any>>();

export function getCached<T>(key: string): T | null {
	const entry = cache.get(key);
	if (!entry) return null;
	if (Date.now() > entry.expiresAt) {
		cache.delete(key);
		return null;
	}
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
