// src/lib/server/rate-limit.ts
// Simple fixed-window in-memory rate limiter.
// Good enough for a single-server deployment — swap for Redis if you ever scale horizontally.

interface Entry {
	count: number;
	resetAt: number;
}

const store = new Map<string, Entry>();

// Prune expired entries every 5 minutes to avoid unbounded memory growth
setInterval(
	() => {
		const now = Date.now();
		for (const [key, entry] of store) {
			if (now > entry.resetAt) store.delete(key);
		}
	},
	5 * 60 * 1000
).unref?.();

/**
 * Returns `{ ok: true }` if the request is within the limit,
 * or `{ ok: false, retryAfter }` (seconds) if it's exceeded.
 */
export function checkRateLimit(
	key: string,
	limit: number,
	windowMs: number
): { ok: boolean; retryAfter?: number } {
	const now = Date.now();
	const entry = store.get(key);

	if (!entry || now > entry.resetAt) {
		store.set(key, { count: 1, resetAt: now + windowMs });
		return { ok: true };
	}

	if (entry.count >= limit) {
		return { ok: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
	}

	entry.count++;
	return { ok: true };
}
