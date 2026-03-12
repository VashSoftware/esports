import * as schema from './schema';
import { env } from '$env/dynamic/private';

if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
if (!process.versions.bun) {
	throw new Error('Bun SQL requires the Bun runtime. If in a dev environment, try running the app with `bun --bun vite dev`.');
}

const { drizzle } = await import('drizzle-orm/bun-sql');

export const db = drizzle(env.DATABASE_URL, { schema });
