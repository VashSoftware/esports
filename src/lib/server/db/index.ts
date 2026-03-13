import * as schema from './schema';
import { building } from '$app/environment';
import { drizzle } from 'drizzle-orm/bun-sql';
import { env } from '$env/dynamic/private';
import { log } from '$lib/server/logger';
import { metrics } from '$lib/server/metrics';

const SLOW_QUERY_THRESHOLD_MS = 100;

function createDb() {
	if (building) return null!;
	if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
	return drizzle(env.DATABASE_URL, {
		schema,
		logger: {
			logQuery(query: string, params: unknown[]) {
				log.db.debug({ query: query.slice(0, 300) }, 'Query');
			}
		}
	});
}

export const db = createDb();

/**
 * Wraps a database operation with timing. Logs slow queries (>100ms)
 * and updates metrics counters.
 *
 * Usage:
 *   const users = await timedQuery('getUsers', () => db.query.user.findMany());
 */
export async function timedQuery<T>(label: string, fn: () => Promise<T>): Promise<T> {
	const start = performance.now();
	try {
		const result = await fn();
		const duration = Math.round(performance.now() - start);
		metrics.totalQueries++;
		metrics.totalQueryTime += duration;
		if (duration > SLOW_QUERY_THRESHOLD_MS) {
			log.db.warn({ label, duration }, 'Slow query');
			metrics.slowQueries++;
		}
		return result;
	} catch (err) {
		log.db.error({ err, label }, 'Query failed');
		throw err;
	}
}
