/**
 * Clear all match data from the database (matches, games, scores, queue, invites, notifications).
 * Keeps users, teams, mappools, and ratings intact.
 *
 * Usage: bun scripts/clear-db.ts
 *   --all    Also clear ratings, teams (except personal), and mappools
 *   --full   Nuclear: clear everything except users and personal teams
 */

import { drizzle } from 'drizzle-orm/bun-sql';
import { sql } from 'drizzle-orm';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('DATABASE_URL not set');

const db = drizzle(DATABASE_URL);

const flag = process.argv[2];

async function main() {
	console.log('Clearing match data...');

	// Always clear match-related data
	await db.execute(sql`DELETE FROM match_game_score`);
	await db.execute(sql`DELETE FROM match_game`);
	await db.execute(sql`DELETE FROM match_participant_player`);
	await db.execute(sql`DELETE FROM match_participant`);
	await db.execute(sql`UPDATE match SET winner_id = NULL`);
	await db.execute(sql`DELETE FROM match`);
	await db.execute(sql`DELETE FROM match_queue`);
	await db.execute(sql`DELETE FROM match_invite`);
	await db.execute(sql`DELETE FROM notification`);
	console.log('  Cleared: matches, games, scores, queue, invites, notifications');

	if (flag === '--all' || flag === '--full') {
		await db.execute(sql`DELETE FROM player_rating`);
		console.log('  Cleared: player ratings');
	}

	if (flag === '--full') {
		await db.execute(
			sql`DELETE FROM team_member WHERE team_id IN (SELECT id FROM team WHERE is_personal = false)`
		);
		await db.execute(sql`DELETE FROM team WHERE is_personal = false`);
		console.log('  Cleared: non-personal teams');

		await db.execute(sql`DELETE FROM mappool_slot`);
		await db.execute(sql`DELETE FROM mappool`);
		console.log('  Cleared: mappools');
	}

	console.log('Done.');
	process.exit(0);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
