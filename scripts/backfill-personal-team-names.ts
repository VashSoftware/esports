/**
 * Backfill personal team names to match the player's current username.
 * Removes any " (personal team)" suffix or other naming inconsistencies.
 *
 * Usage: bun scripts/backfill-personal-team-names.ts
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, and } from 'drizzle-orm';
import { pgTable, text, uuid, boolean, timestamp } from 'drizzle-orm/pg-core';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('DATABASE_URL not set');

const client = postgres(DATABASE_URL);
const db = drizzle(client);

const team = pgTable('team', {
	id: uuid('id').primaryKey(),
	name: text('name').notNull(),
	isPersonal: boolean('is_personal').notNull(),
	ownerId: text('owner_id')
});

const user = pgTable('user', {
	id: text('id').primaryKey(),
	name: text('name').notNull()
});

async function main() {
	const personalTeams = await db.select().from(team).where(eq(team.isPersonal, true));
	console.log(`Found ${personalTeams.length} personal teams`);

	let updated = 0;
	for (const t of personalTeams) {
		if (!t.ownerId) continue;

		const [owner] = await db.select().from(user).where(eq(user.id, t.ownerId));
		if (!owner) continue;

		if (t.name !== owner.name) {
			await db.update(team).set({ name: owner.name }).where(eq(team.id, t.id));
			console.log(`  "${t.name}" -> "${owner.name}"`);
			updated++;
		}
	}

	console.log(`Updated ${updated} personal team names`);
	process.exit(0);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
