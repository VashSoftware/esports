import { env } from '$env/dynamic/private';
import { S3Client } from 'bun';

function isConfigured(): boolean {
	return !!(env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY && env.R2_ACCOUNT_ID && env.R2_BUCKET && env.R2_PUBLIC_URL);
}

let client: S3Client | null = null;

function getClient(): S3Client {
	if (!client) {
		client = new S3Client({
			accessKeyId: env.R2_ACCESS_KEY_ID,
			secretAccessKey: env.R2_SECRET_ACCESS_KEY,
			bucket: env.R2_BUCKET,
			endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
		});
	}
	return client;
}

function urlToKey(url: string): string {
	const u = new URL(url);
	if (u.hostname === 'assets.ppy.sh') {
		// e.g. /beatmaps/3591031/covers/card@2x.jpg → beatmaps/3591031/covers/card@2x.jpg
		return u.pathname.replace(/^\//, '');
	}
	if (u.hostname === 'a.ppy.sh') {
		// e.g. /12345 → avatars/12345
		return `avatars${u.pathname}`;
	}
	// Generic fallback: stable key from URL path
	return `misc${u.pathname}`;
}

// In-memory set of keys confirmed to exist in R2 (reset on server restart — that's fine)
const knownKeys = new Set<string>();

/**
 * Returns a CDN URL for the given osu! image URL, uploading to R2 on first access.
 * Returns null if R2 is not configured or the upload/fetch fails.
 */
export async function proxyImage(osuUrl: string): Promise<string | null> {
	if (!isConfigured()) return null;

	const key = urlToKey(osuUrl);
	const cdnUrl = `${env.R2_PUBLIC_URL}/${key}`;

	if (knownKeys.has(key)) return cdnUrl;

	try {
		const r2 = getClient();
		const file = r2.file(key);

		const exists = await file.exists();
		if (!exists) {
			const res = await fetch(osuUrl);
			if (!res.ok) throw new Error(`fetch ${osuUrl} → ${res.status}`);
			const contentType = res.headers.get('content-type') ?? 'image/jpeg';
			await file.write(res, { type: contentType });
			console.log(`[R2] uploaded ${key}`);
		}

		knownKeys.add(key);
		return cdnUrl;
	} catch (err: unknown) {
		console.error('[R2] proxyImage failed for', key, '—', err instanceof Error ? err.message : err);
		return null;
	}
}
