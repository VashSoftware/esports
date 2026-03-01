/**
 * One-time script to upload existing user avatars and beatmap covers to R2.
 * Run with: bun run scripts/backfill-r2.ts
 * Reads credentials from .env automatically.
 */

import postgres from 'postgres';
import { S3Client } from 'bun';

// ── Config from env ────────────────────────────────────────────────────

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID!;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!;
const R2_BUCKET = process.env.R2_BUCKET!;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL!;
const DATABASE_URL = process.env.DATABASE_URL!;
const OSU_CLIENT_ID = process.env.OSU_CLIENT_ID!;
const OSU_CLIENT_SECRET = process.env.OSU_CLIENT_SECRET!;

for (const [k, v] of Object.entries({ R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL, DATABASE_URL, OSU_CLIENT_ID, OSU_CLIENT_SECRET })) {
	if (!v) { console.error(`Missing env var: ${k}`); process.exit(1); }
}

// ── R2 client ──────────────────────────────────────────────────────────

const r2 = new S3Client({
	accessKeyId: R2_ACCESS_KEY_ID,
	secretAccessKey: R2_SECRET_ACCESS_KEY,
	bucket: R2_BUCKET,
	endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
});

function urlToKey(url: string): string {
	const u = new URL(url);
	if (u.hostname === 'assets.ppy.sh') return u.pathname.replace(/^\//, '');
	if (u.hostname === 'a.ppy.sh') return `avatars${u.pathname}`;
	return `misc${u.pathname}`;
}

async function uploadIfMissing(url: string): Promise<'uploaded' | 'exists' | 'failed'> {
	const key = urlToKey(url);
	try {
		const file = r2.file(key);
		if (await file.exists()) return 'exists';

		const res = await fetch(url);
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		const contentType = res.headers.get('content-type') ?? 'image/jpeg';
		await file.write(res, { type: contentType });
		return 'uploaded';
	} catch (err: unknown) {
		console.error(`  ✗ ${key} — ${err instanceof Error ? err.message : err}`);
		return 'failed';
	}
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// ── osu! API ───────────────────────────────────────────────────────────

let osuToken: string | null = null;
let osuTokenExpiry = 0;

async function getOsuToken(): Promise<string> {
	if (osuToken && Date.now() < osuTokenExpiry - 60_000) return osuToken;
	const res = await fetch('https://osu.ppy.sh/oauth/token', {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			client_id: OSU_CLIENT_ID,
			client_secret: OSU_CLIENT_SECRET,
			grant_type: 'client_credentials',
			scope: 'public'
		})
	});
	if (!res.ok) throw new Error(`osu! token failed: ${res.status}`);
	const data = await res.json() as { access_token: string; expires_in: number };
	osuToken = data.access_token;
	osuTokenExpiry = Date.now() + data.expires_in * 1000;
	return osuToken;
}

async function getBeatmapCovers(beatmapId: string): Promise<{ card: string; list: string } | null> {
	try {
		const token = await getOsuToken();
		const res = await fetch(`https://osu.ppy.sh/api/v2/beatmaps/${beatmapId}`, {
			headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
		});
		if (!res.ok) return null;
		const data = await res.json() as { beatmapset: { covers: Record<string, string> } };
		return {
			card: data.beatmapset.covers['card@2x'],
			list: data.beatmapset.covers['list@2x']
		};
	} catch {
		return null;
	}
}

// ── Main ───────────────────────────────────────────────────────────────

const sql = postgres(DATABASE_URL);

console.log('── Backfilling user avatars ─────────────────────────────');

const users = await sql<{ image: string }[]>`
	SELECT image FROM "user" WHERE image IS NOT NULL AND image != ''
`;

let uploaded = 0, skipped = 0, failed = 0;
for (const { image } of users) {
	if (!image.includes('ppy.sh') && !image.includes('a.ppy.sh')) {
		// Non-osu avatar, skip for now
		continue;
	}
	const result = await uploadIfMissing(image);
	if (result === 'uploaded') { uploaded++; console.log(`  ↑ ${urlToKey(image)}`); }
	else if (result === 'exists') skipped++;
	else failed++;
}
console.log(`Done: ${uploaded} uploaded, ${skipped} already existed, ${failed} failed\n`);

console.log('── Backfilling beatmap covers ────────────────────────────');

const slots = await sql<{ beatmap_id: string }[]>`
	SELECT DISTINCT beatmap_id FROM mappool_slot
`;

console.log(`Found ${slots.length} unique beatmaps\n`);

uploaded = 0; skipped = 0; failed = 0;
for (const { beatmap_id } of slots) {
	process.stdout.write(`  beatmap ${beatmap_id} ... `);
	const covers = await getBeatmapCovers(beatmap_id);
	if (!covers) {
		console.log('✗ not found on osu!');
		failed++;
		continue;
	}

	let ok = true;
	for (const url of [covers.card, covers.list]) {
		if (!url) continue;
		const result = await uploadIfMissing(url);
		if (result === 'failed') ok = false;
		if (result === 'uploaded') uploaded++;
		if (result === 'exists') skipped++;
	}
	console.log(ok ? '✓' : '✗ partial');

	// Be polite to osu! API — 10 req/s max
	await sleep(120);
}

console.log(`\nDone: ${uploaded} uploaded, ${skipped} already existed, ${failed} failed`);

await sql.end();
