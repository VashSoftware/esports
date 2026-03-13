import * as schema from './schema';
import { building } from '$app/environment';
import { drizzle } from 'drizzle-orm/bun-sql';
import { env } from '$env/dynamic/private';

function createDb() {
	if (building) return null!;
	if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
	return drizzle(env.DATABASE_URL, { schema });
}

export const db = createDb();
