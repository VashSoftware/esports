/**
 * Re-seed all existing player ratings from osu! global rank.
 *
 * Formula: elo = 3500 - log10(rank) * 500, clamped to [0, 3500]
 * Adjusted by win/loss differential: seedElo + (wins - losses) * 12
 *
 * Run with: bun run scripts/reseed-ratings.ts
 */

import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL!;
const OSU_CLIENT_ID = process.env.OSU_CLIENT_ID!;
const OSU_CLIENT_SECRET = process.env.OSU_CLIENT_SECRET!;

for (const [k, v] of Object.entries({ DATABASE_URL, OSU_CLIENT_ID, OSU_CLIENT_SECRET })) {
	if (!v) {
		console.error(`Missing env var: ${k}`);
		process.exit(1);
	}
}

const sql = postgres(DATABASE_URL);

// ── osu! API ───────────────────────────────────────────────────────────

let clientToken: string | null = null;
let clientTokenExpiresAt = 0;

async function getClientToken(): Promise<string> {
	if (clientToken && Date.now() < clientTokenExpiresAt - 60_000) {
		return clientToken;
	}

	const res = await fetch('https://osu.ppy.sh/oauth/token', {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			client_id: OSU_CLIENT_ID,
			client_secret: OSU_CLIENT_SECRET,
			grant_type: 'client_credentials',
			scope: 'identify public'
		})
	});

	if (!res.ok) throw new Error(`osu! token: ${res.status}`);
	const data = await res.json();
	clientToken = data.access_token;
	clientTokenExpiresAt = Date.now() + data.expires_in * 1000;
	return clientToken!;
}

async function getOsuUser(osuId: string) {
	const token = await getClientToken();
	const res = await fetch(`https://osu.ppy.sh/api/v2/users/${osuId}`, {
		headers: { Authorization: `Bearer ${token}` }
	});
	if (!res.ok) throw new Error(`osu! user ${osuId}: ${res.status}`);
	return res.json();
}

function rankToElo(rank: number): number {
	const raw = 3500 - Math.log10(rank) * 500;
	return Math.round(Math.max(0, Math.min(3500, raw)));
}

// ── Main ───────────────────────────────────────────────────────────────

async function main() {
	const ratings = await sql`SELECT pr.id, pr.user_id, pr.elo, pr.wins, pr.losses
		FROM player_rating pr`;

	console.log(`Found ${ratings.length} player(s) to re-seed\n`);

	let updated = 0;
	let skipped = 0;

	for (const r of ratings) {
		// Look up the osu! account ID for this user
		const [acc] = await sql`SELECT account_id FROM account
			WHERE user_id = ${r.user_id} AND provider_id = 'osu' LIMIT 1`;

		let rank: number | null = null;

		if (!acc) {
			console.log(`  [WARN] user ${r.user_id} — no osu! account linked, treating as unranked`);
		} else {
			try {
				const osuUser = await getOsuUser(acc.account_id);
				rank = osuUser?.statistics?.global_rank ?? null;
			} catch (err: any) {
				console.error(`  [ERR] user ${r.user_id} (osu! ${acc.account_id}):`, err.message);
				skipped++;
				continue;
			}
		}

		// Unranked → rank 100,000 (~1000 ELO)
		const effectiveRank = rank && rank > 0 ? rank : 100_000;
		const seedElo = rankToElo(effectiveRank);
		// Adjust by win/loss differential to preserve some earned progress
		const adjustment = (r.wins - r.losses) * 12;
		const finalElo = Math.max(0, Math.min(3500, seedElo + adjustment));

		await sql`UPDATE player_rating SET
			elo = ${finalElo},
			initial_elo = ${seedElo},
			osu_rank_at_seed = ${rank},
			updated_at = now()
			WHERE id = ${r.id}`;

		console.log(
			`  [OK] user ${r.user_id} — rank #${rank ? rank.toLocaleString() : 'unranked (10M)'} → seed ${seedElo}, adj ${adjustment > 0 ? '+' : ''}${adjustment} → final ${finalElo} (was ${r.elo})`
		);
		updated++;

		// Rate limit: 500ms between API calls
		await new Promise((resolve) => setTimeout(resolve, 500));
	}

	console.log(`\nDone: ${updated} updated, ${skipped} skipped`);
	await sql.end();
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
