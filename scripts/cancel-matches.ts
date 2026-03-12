/**
 * Cancel all active matches (CREATED, LOBBY, ROLLING, PICKING, PLAYING).
 *
 * Usage: bun scripts/cancel-matches.ts
 */

import { drizzle } from 'drizzle-orm/bun-sql';
import { sql } from 'drizzle-orm';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('DATABASE_URL not set');

const db = drizzle(DATABASE_URL);

async function main() {
	const result = await db.execute(sql`
		UPDATE match
		SET state = 'CANCELLED', finished_at = now()
		WHERE state IN ('CREATED', 'LOBBY', 'ROLLING', 'PICKING', 'PLAYING')
		RETURNING id, name, state
	`);

	const rows = result as any[];
	console.log(`Cancelled ${rows.length} active match${rows.length !== 1 ? 'es' : ''}:`);
	for (const r of rows) {
		console.log(`  ${r.id} — ${r.name ?? '(unnamed)'}`);
	}

	// Also clear the queue
	const queueResult = await db.execute(sql`DELETE FROM match_queue RETURNING id`);
	const queueRows = queueResult as any[];
	if (queueRows.length > 0) {
		console.log(`Cleared ${queueRows.length} queue entr${queueRows.length !== 1 ? 'ies' : 'y'}`);
	}

	process.exit(0);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
