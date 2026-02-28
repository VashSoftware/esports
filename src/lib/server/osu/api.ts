// src/lib/server/osu/api.ts
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db';
import { and, eq } from 'drizzle-orm';
import { account } from '$lib/server/db/auth.schema';
import { getCached, setCache } from './cache';

let clientToken: string | null = null;
let clientTokenExpiresAt = 0;

async function getClientToken(): Promise<string> {
	if (clientToken && Date.now() < clientTokenExpiresAt - 60_000) {
		return clientToken;
	}

	const res = await fetch('https://osu.ppy.sh/oauth/token', {
		method: 'POST',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/x-www-form-urlencoded'
		},
		body: new URLSearchParams({
			client_id: env.OSU_CLIENT_ID!,
			client_secret: env.OSU_CLIENT_SECRET!,
			grant_type: 'client_credentials',
			scope: 'identify public'
		})
	});

	if (!res.ok) {
		throw new Error(`Failed to get osu! client token: ${res.status} ${res.statusText}`);
	}

	const data = await res.json();
	clientToken = data.access_token;
	clientTokenExpiresAt = Date.now() + data.expires_in * 1000;
	return clientToken!;
}

async function getUserToken(userId: string): Promise<string | null> {
	const acc = await db.query.account.findFirst({
		where: and(eq(account.userId, userId), eq(account.providerId, 'osu'))
	});

	if (!acc?.accessToken) return null;

	if (acc.accessTokenExpiresAt && acc.accessTokenExpiresAt < new Date()) {
		if (!acc.refreshToken) return null;

		const res = await fetch('https://osu.ppy.sh/oauth/token', {
			method: 'POST',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			body: new URLSearchParams({
				client_id: env.OSU_CLIENT_ID!,
				client_secret: env.OSU_CLIENT_SECRET!,
				grant_type: 'refresh_token',
				refresh_token: acc.refreshToken,
				scope: 'identify public'
			})
		});

		if (!res.ok) return null;

		const data = await res.json();
		await db
			.update(account)
			.set({
				accessToken: data.access_token,
				refreshToken: data.refresh_token,
				accessTokenExpiresAt: new Date(Date.now() + data.expires_in * 1000)
			})
			.where(eq(account.id, acc.id));

		return data.access_token;
	}

	return acc.accessToken;
}

async function osuFetch(path: string, token?: string) {
	const t = token ?? (await getClientToken());
	const res = await fetch(`https://osu.ppy.sh/api/v2${path}`, {
		headers: { Authorization: `Bearer ${t}` }
	});

	if (!res.ok) {
		throw new Error(`osu! API ${path}: ${res.status} ${res.statusText}`);
	}

	return res.json();
}

// ── Public API (with caching) ───────────────────────────────────────────

export async function getBeatmap(beatmapId: string | number) {
	const cacheKey = `beatmap:${beatmapId}`;
	const cached = getCached(cacheKey);
	if (cached) return cached;

	const data = await osuFetch(`/beatmaps/${beatmapId}`);
	setCache(cacheKey, data);
	return data;
}

export async function getBeatmapset(beatmapsetId: string | number) {
	const cacheKey = `beatmapset:${beatmapsetId}`;
	const cached = getCached(cacheKey);
	if (cached) return cached;

	const data = await osuFetch(`/beatmapsets/${beatmapsetId}`);
	setCache(cacheKey, data);
	return data;
}

export async function getUser(userId: string | number) {
	const cacheKey = `osu_user:${userId}`;
	const cached = getCached(cacheKey);
	if (cached) return cached;

	const data = await osuFetch(`/users/${userId}`);
	setCache(cacheKey, data, 5 * 60 * 1000); // 5 min for user data
	return data;
}

export async function getUserScores(
	userId: string | number,
	type: 'best' | 'recent' | 'firsts' = 'best',
	limit = 10
) {
	return osuFetch(`/users/${userId}/scores/${type}?limit=${limit}`);
}

export { getUserToken, getClientToken };
