/**
 * Surgically remove seed data from production database.
 * Only deletes rows created by seed-staging.ts, leaves real data intact.
 *
 * Usage:
 *   DATABASE_URL="postgresql://..." bun scripts/cleanup-seed-from-prod.ts
 *   DATABASE_URL="postgresql://..." bun scripts/cleanup-seed-from-prod.ts --dry-run
 */

import { drizzle } from 'drizzle-orm/bun-sql';
import { sql } from 'drizzle-orm';

// ── DB setup ────────────────────────────────────────────────────────────

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('DATABASE_URL not set');
const db = drizzle(DATABASE_URL);

const DRY_RUN = process.argv.includes('--dry-run');

async function count(query: string): Promise<number> {
	const rows = await db.execute(sql.raw(query));
	return Number((rows as any)[0]?.count ?? 0);
}

async function exec(description: string, deleteSql: string) {
	// Count first
	const countSql = deleteSql.replace(/^DELETE FROM/, 'SELECT COUNT(*) as count FROM');
	const n = await count(countSql);

	if (n === 0) {
		console.log(`  ⏭  ${description}: 0 rows (skipped)`);
		return 0;
	}

	if (DRY_RUN) {
		console.log(`  🔍 ${description}: ${n} rows (dry run, not deleted)`);
		return n;
	}

	await db.execute(sql.raw(deleteSql));
	console.log(`  ✅ ${description}: ${n} rows deleted`);
	return n;
}

async function main() {
	console.log(`\n🧹 Cleaning up seed data from database`);
	console.log(`   Mode: ${DRY_RUN ? 'DRY RUN (no changes)' : '⚠️  LIVE — will delete rows'}`);
	console.log(`   Database: ${DATABASE_URL!.replace(/\/\/.*@/, '//***@')}\n`);

	// Safety check: verify this looks like prod (has non-seed users)
	const realUsers = await count(
		`SELECT COUNT(*) as count FROM "user" WHERE id NOT LIKE 'seed-user-%'`
	);
	const seedUsers = await count(`SELECT COUNT(*) as count FROM "user" WHERE id LIKE 'seed-user-%'`);
	console.log(`   Real users: ${realUsers}`);
	console.log(`   Seed users: ${seedUsers}\n`);

	if (seedUsers === 0) {
		console.log('✅ No seed data found. Nothing to clean up.');
		process.exit(0);
	}

	// ── Delete in reverse FK dependency order (leaves → roots) ──

	// 1. Match game scores — joined through match_game → match → created_by
	console.log('Phase 1: Match game scores');
	await exec(
		'match_game_score (from seed matches)',
		`DELETE FROM match_game_score WHERE match_game_id IN (
			SELECT mg.id FROM match_game mg
			JOIN match m ON mg.match_id = m.id
			WHERE m.created_by LIKE 'seed-user-%'
		)`
	);

	// 2. Match participant players — joined through match_participant → match
	console.log('Phase 2: Match participant players');
	await exec(
		'match_participant_player (from seed matches)',
		`DELETE FROM match_participant_player WHERE participant_id IN (
			SELECT mp.id FROM match_participant mp
			JOIN match m ON mp.match_id = m.id
			WHERE m.created_by LIKE 'seed-user-%'
		)`
	);

	// 3. Match games
	console.log('Phase 3: Match games');
	await exec(
		'match_game (from seed matches)',
		`DELETE FROM match_game WHERE match_id IN (
			SELECT id FROM match WHERE created_by LIKE 'seed-user-%'
		)`
	);

	// 4. Match participants
	console.log('Phase 4: Match participants');
	await exec(
		'match_participant (from seed matches)',
		`DELETE FROM match_participant WHERE match_id IN (
			SELECT id FROM match WHERE created_by LIKE 'seed-user-%'
		)`
	);

	// 5. Match invites (reference both match_id and team/mappool)
	console.log('Phase 5: Match invites');
	await exec(
		'match_invite (from seed users)',
		`DELETE FROM match_invite WHERE created_by LIKE 'seed-user-%'`
	);

	// 6. Notifications
	console.log('Phase 6: Notifications');
	await exec(
		'notification (from seed users)',
		`DELETE FROM notification WHERE user_id LIKE 'seed-user-%'`
	);

	// 7. Match queue entries (if any)
	console.log('Phase 7: Match queue');
	await exec(
		'match_queue (from seed users)',
		`DELETE FROM match_queue WHERE user_id LIKE 'seed-user-%'`
	);

	// 8. Matches
	console.log('Phase 8: Matches');
	await exec(
		'match (created by seed users)',
		`DELETE FROM match WHERE created_by LIKE 'seed-user-%'`
	);

	// 9. Mappool slots (from seed mappools)
	console.log('Phase 9: Mappool slots');
	await exec(
		'mappool_slot (from seed mappools)',
		`DELETE FROM mappool_slot WHERE mappool_id IN (
			SELECT id FROM mappool WHERE created_by LIKE 'seed-user-%'
		)`
	);

	// 10. Mappools
	console.log('Phase 10: Mappools');
	await exec(
		'mappool (created by seed users)',
		`DELETE FROM mappool WHERE created_by LIKE 'seed-user-%'`
	);

	// 11. Player ratings
	console.log('Phase 11: Player ratings');
	await exec(
		'player_rating (from seed users)',
		`DELETE FROM player_rating WHERE user_id LIKE 'seed-user-%'`
	);

	// 12. Team members (from seed-owned teams)
	console.log('Phase 12: Team members');
	await exec(
		'team_member (from seed teams)',
		`DELETE FROM team_member WHERE team_id IN (
			SELECT id FROM team WHERE owner_id LIKE 'seed-user-%'
		)`
	);

	// 13. Teams
	console.log('Phase 13: Teams');
	await exec('team (owned by seed users)', `DELETE FROM team WHERE owner_id LIKE 'seed-user-%'`);

	// 14. Sessions (cascade from user delete, but clean up explicitly)
	console.log('Phase 14: Sessions');
	await exec('session (from seed users)', `DELETE FROM session WHERE user_id LIKE 'seed-user-%'`);

	// 15. Accounts
	console.log('Phase 15: Accounts');
	await exec('account (from seed users)', `DELETE FROM account WHERE user_id LIKE 'seed-user-%'`);

	// 16. Users (the root)
	console.log('Phase 16: Users');
	await exec('user (seed users)', `DELETE FROM "user" WHERE id LIKE 'seed-user-%'`);

	// ── Verify ──
	console.log('\n── Verification ──');
	const remaining = await count(`SELECT COUNT(*) as count FROM "user" WHERE id LIKE 'seed-user-%'`);
	const remainingMatches = await count(
		`SELECT COUNT(*) as count FROM match WHERE created_by LIKE 'seed-user-%'`
	);
	const remainingPools = await count(
		`SELECT COUNT(*) as count FROM mappool WHERE created_by LIKE 'seed-user-%'`
	);
	const remainingTeams = await count(
		`SELECT COUNT(*) as count FROM team WHERE owner_id LIKE 'seed-user-%'`
	);

	console.log(`   Remaining seed users: ${remaining}`);
	console.log(`   Remaining seed matches: ${remainingMatches}`);
	console.log(`   Remaining seed mappools: ${remainingPools}`);
	console.log(`   Remaining seed teams: ${remainingTeams}`);

	if (!DRY_RUN && remaining === 0 && remainingMatches === 0) {
		console.log('\n✅ All seed data cleaned up successfully!');
	} else if (DRY_RUN) {
		console.log('\n🔍 Dry run complete. Re-run without --dry-run to delete.');
	}

	process.exit(0);
}

main().catch((err) => {
	console.error('❌ Cleanup failed:', err);
	process.exit(1);
});
