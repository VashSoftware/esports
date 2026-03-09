/**
 * Seed the database with test data for development.
 * Creates fake teams and mappools if none exist.
 *
 * Usage: bun scripts/seed-db.ts
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';
import { pgTable, text, uuid, boolean, timestamp, integer, real, jsonb } from 'drizzle-orm/pg-core';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('DATABASE_URL not set');

const client = postgres(DATABASE_URL);
const db = drizzle(client);

const mappool = pgTable('mappool', {
	id: uuid('id').primaryKey().defaultRandom(),
	name: text('name').notNull(),
	createdBy: text('created_by'),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	verifiedAt: timestamp('verified_at')
});

const mappoolSlot = pgTable('mappool_slot', {
	id: uuid('id').primaryKey().defaultRandom(),
	mappoolId: uuid('mappool_id').notNull(),
	category: text('category').notNull(),
	orderInCategory: integer('order_in_category').notNull(),
	beatmapId: text('beatmap_id').notNull(),
	starRating: real('star_rating'),
	bpm: real('bpm'),
	totalLength: integer('total_length'),
	mods: text('mods').array().default([]).notNull(),
	title: text('title'),
	artist: text('artist'),
	version: text('version'),
	coverUrl: text('cover_url'),
	listCoverUrl: text('list_cover_url')
});

// Sample beatmap IDs (real osu! maps)
const SAMPLE_MAPS = [
	{ id: '75', category: 'NM', title: 'Disco Prince', artist: 'Kenji Ninuma', sr: 2.5, bpm: 120 },
	{ id: '163', category: 'NM', title: 'Crazy Noisy Bizarre Town', artist: 'The DU', sr: 3.2, bpm: 140 },
	{ id: '250', category: 'HD', title: 'Sakura Kagetsu', artist: 'Mutsuhiko Izumi', sr: 4.1, bpm: 165 },
	{ id: '306', category: 'HR', title: 'Airman ga Taosenai', artist: 'Team Nekokan', sr: 5.0, bpm: 200 },
	{ id: '390', category: 'DT', title: 'Kira Kira Days', artist: 'MOSAIC.WAV', sr: 4.5, bpm: 175 },
	{ id: '455', category: 'FM', title: 'FREEDOM DiVE', artist: 'xi', sr: 6.0, bpm: 222 },
	{ id: '500', category: 'TB', title: 'Blue Zenith', artist: 'xi', sr: 6.5, bpm: 200 }
];

async function main() {
	// Check if mappools exist
	const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(mappool);

	if (Number(count) > 0) {
		console.log(`${count} mappool(s) already exist, skipping seed.`);
		console.log('Run "bun scripts/clear-db.ts --full" first to clear everything.');
		process.exit(0);
	}

	// Create a sample mappool
	const [pool] = await db.insert(mappool).values({
		name: 'Dev Test Pool',
		verifiedAt: new Date()
	}).returning();

	console.log(`Created mappool: ${pool.name} (${pool.id})`);

	for (let i = 0; i < SAMPLE_MAPS.length; i++) {
		const m = SAMPLE_MAPS[i];
		const sameCategory = SAMPLE_MAPS.filter((x, j) => j <= i && x.category === m.category);
		await db.insert(mappoolSlot).values({
			mappoolId: pool.id,
			category: m.category,
			orderInCategory: sameCategory.length,
			beatmapId: m.id,
			starRating: m.sr,
			bpm: m.bpm,
			totalLength: 120,
			mods: m.category === 'NM' || m.category === 'TB' ? [] : [m.category],
			title: m.title,
			artist: m.artist,
			version: 'Normal'
		});
	}

	console.log(`  Added ${SAMPLE_MAPS.length} maps (${[...new Set(SAMPLE_MAPS.map((m) => m.category))].join(', ')})`);
	console.log('Done. Sign in via osu! OAuth to create a user and personal team.');
	process.exit(0);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
