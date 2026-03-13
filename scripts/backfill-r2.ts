/**
 * Backfill ALL images into R2:
 *  1. Mappool slot covers (title/artist/version/coverUrl/listCoverUrl)
 *  2. User avatars still pointing at osu! servers
 *  3. Team avatars still pointing at osu! servers
 *
 * Run with: bun run scripts/backfill-r2-all.ts
 * Reads credentials from .env automatically.
 *
 * After running, do `bun run db:push` to add the new schema columns,
 * then run this script to populate them.
 */

import { SQL, S3Client } from 'bun';

// ── Config ─────────────────────────────────────────────────────────────

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID!;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!;
const R2_BUCKET = process.env.R2_BUCKET!;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL!;
const DATABASE_URL = process.env.DATABASE_URL!;
const OSU_CLIENT_ID = process.env.OSU_CLIENT_ID!;
const OSU_CLIENT_SECRET = process.env.OSU_CLIENT_SECRET!;

for (const [k, v] of Object.entries({
	R2_ACCOUNT_ID,
	R2_ACCESS_KEY_ID,
	R2_SECRET_ACCESS_KEY,
	R2_BUCKET,
	R2_PUBLIC_URL,
	DATABASE_URL,
	OSU_CLIENT_ID,
	OSU_CLIENT_SECRET
})) {
	if (!v) {
		console.error(`Missing env var: ${k}`);
		process.exit(1);
	}
}

// ── R2 ─────────────────────────────────────────────────────────────────

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

async function proxyToR2(osuUrl: string): Promise<string> {
	const key = urlToKey(osuUrl);
	const cdnUrl = `${R2_PUBLIC_URL}/${key}`;
	try {
		const file = r2.file(key);
		if (await file.exists()) return cdnUrl;

		const res = await fetch(osuUrl);
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		const contentType = res.headers.get('content-type') ?? 'image/jpeg';
		await file.write(res, { type: contentType });
		console.log(`  ↑ uploaded ${key}`);
		return cdnUrl;
	} catch (err: unknown) {
		console.error(`  ✗ failed ${key}: ${err instanceof Error ? err.message : err}`);
		return osuUrl; // Return original on failure
	}
}

function isOsuUrl(url: string | null): boolean {
	if (!url) return false;
	try {
		const u = new URL(url);
		return u.hostname.endsWith('.ppy.sh');
	} catch {
		return false;
	}
}

function sleep(ms: number) {
	return new Promise((r) => setTimeout(r, ms));
}

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
	const data = (await res.json()) as { access_token: string; expires_in: number };
	osuToken = data.access_token;
	osuTokenExpiry = Date.now() + data.expires_in * 1000;
	return osuToken;
}

interface BeatmapData {
	beatmapset: {
		title: string;
		artist: string;
		covers: Record<string, string>;
	};
	version: string;
	difficulty_rating: number;
	bpm: number;
	total_length: number;
}

async function getBeatmap(beatmapId: string): Promise<BeatmapData | null> {
	try {
		const token = await getOsuToken();
		const res = await fetch(`https://osu.ppy.sh/api/v2/beatmaps/${beatmapId}`, {
			headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
		});
		if (!res.ok) return null;
		return (await res.json()) as BeatmapData;
	} catch {
		return null;
	}
}

// ── Main ───────────────────────────────────────────────────────────────

const sql = new SQL(DATABASE_URL);

// ════════════════════════════════════════════════════════════════════════
// 1. MAPPOOL SLOTS — backfill title/artist/version/coverUrl/listCoverUrl
// ════════════════════════════════════════════════════════════════════════

console.log('═══ 1/3: Backfilling mappool slot metadata + covers ═══\n');

const slots = await sql<
	{ id: string; beatmap_id: string; cover_url: string | null; title: string | null }[]
>`
	SELECT id, beatmap_id, cover_url, title FROM mappool_slot
	WHERE cover_url IS NULL OR title IS NULL
`;

console.log(`Found ${slots.length} slots missing metadata\n`);

let slotOk = 0,
	slotFail = 0;
for (const slot of slots) {
	process.stdout.write(`  beatmap ${slot.beatmap_id} ... `);
	const bm = await getBeatmap(slot.beatmap_id);
	if (!bm) {
		console.log('✗ not found on osu!');
		slotFail++;
		continue;
	}

	const cardUrl = bm.beatmapset.covers['card@2x'];
	const listUrl = bm.beatmapset.covers['list@2x'];

	const coverUrl = cardUrl ? await proxyToR2(cardUrl) : null;
	const listCoverUrl = listUrl ? await proxyToR2(listUrl) : null;

	await sql`
		UPDATE mappool_slot SET
			title = ${bm.beatmapset.title},
			artist = ${bm.beatmapset.artist},
			version = ${bm.version},
			star_rating = ${bm.difficulty_rating},
			bpm = ${bm.bpm},
			total_length = ${bm.total_length},
			cover_url = ${coverUrl},
			list_cover_url = ${listCoverUrl}
		WHERE id = ${slot.id}
	`;

	console.log('✓');
	slotOk++;
	await sleep(120); // Rate limit osu! API
}

console.log(`\nSlots: ${slotOk} updated, ${slotFail} failed\n`);

// Also update any slots that have osu! URLs instead of R2 URLs (partially migrated)
const osuUrlSlots = await sql<
	{ id: string; cover_url: string | null; list_cover_url: string | null }[]
>`
	SELECT id, cover_url, list_cover_url FROM mappool_slot
	WHERE (cover_url LIKE '%ppy.sh%' OR list_cover_url LIKE '%ppy.sh%')
`;

if (osuUrlSlots.length > 0) {
	console.log(`Found ${osuUrlSlots.length} slots with osu! URLs (need R2 proxy)\n`);
	for (const slot of osuUrlSlots) {
		const newCover =
			slot.cover_url && isOsuUrl(slot.cover_url) ? await proxyToR2(slot.cover_url) : slot.cover_url;
		const newList =
			slot.list_cover_url && isOsuUrl(slot.list_cover_url)
				? await proxyToR2(slot.list_cover_url)
				: slot.list_cover_url;
		await sql`UPDATE mappool_slot SET cover_url = ${newCover}, list_cover_url = ${newList} WHERE id = ${slot.id}`;
	}
	console.log('Done re-proxying slot covers\n');
}

// ════════════════════════════════════════════════════════════════════════
// 2. USER AVATARS — re-proxy any still pointing at ppy.sh
// ════════════════════════════════════════════════════════════════════════

console.log('═══ 2/3: Backfilling user avatars ═══\n');

const users = await sql<{ id: string; image: string | null }[]>`
	SELECT id, image FROM "user" WHERE image IS NOT NULL
`;

let avatarOk = 0,
	avatarSkip = 0;
for (const u of users) {
	if (!isOsuUrl(u.image)) {
		avatarSkip++;
		continue;
	}
	process.stdout.write(`  user ${u.id} (${u.image}) ... `);
	const cdnUrl = await proxyToR2(u.image!);
	if (cdnUrl !== u.image) {
		await sql`UPDATE "user" SET image = ${cdnUrl} WHERE id = ${u.id}`;
		console.log('✓ updated');
		avatarOk++;
	} else {
		console.log('— unchanged (proxy failed)');
	}
}

console.log(`\nAvatars: ${avatarOk} updated, ${avatarSkip} already R2\n`);

// ════════════════════════════════════════════════════════════════════════
// 3. TEAM AVATARS — re-proxy any still pointing at ppy.sh
// ════════════════════════════════════════════════════════════════════════

console.log('═══ 3/3: Backfilling team avatars ═══\n');

const teams = await sql<{ id: string; avatar_url: string | null }[]>`
	SELECT id, avatar_url FROM team WHERE avatar_url IS NOT NULL
`;

let teamOk = 0,
	teamSkip = 0;
for (const t of teams) {
	if (!isOsuUrl(t.avatar_url)) {
		teamSkip++;
		continue;
	}
	process.stdout.write(`  team ${t.id} ... `);
	const cdnUrl = await proxyToR2(t.avatar_url!);
	if (cdnUrl !== t.avatar_url) {
		await sql`UPDATE team SET avatar_url = ${cdnUrl} WHERE id = ${t.id}`;
		console.log('✓ updated');
		teamOk++;
	} else {
		console.log('— unchanged');
	}
}

console.log(`\nTeams: ${teamOk} updated, ${teamSkip} already R2\n`);

// ════════════════════════════════════════════════════════════════════════

console.log('═══ All done! ═══');
console.log('Summary:');
console.log(`  Mappool slots:  ${slotOk} backfilled, ${slotFail} failed`);
console.log(`  User avatars:   ${avatarOk} re-proxied, ${avatarSkip} already R2`);
console.log(`  Team avatars:   ${teamOk} re-proxied, ${teamSkip} already R2`);

await sql.close();
