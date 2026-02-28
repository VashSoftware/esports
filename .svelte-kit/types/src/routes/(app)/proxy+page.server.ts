// @ts-nocheck
// src/routes/(app)/+page.server.ts
import { db } from '$lib/server/db';
import { match, team, mappool } from '$lib/server/db/schema';
import { eq, desc, count, inArray } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load = async ({ locals }: Parameters<PageServerLoad>[0]) => {
	// ── NOT LOGGED IN → landing page (no redirect loop!) ──
	if (!locals.user) {
		return {
			authenticated: false as const,
			recentMatches: [],
			liveMatches: [],
			stats: { matches: 0, finished: 0, teams: 0, mappools: 0 }
		};
	}

	// ── LOGGED IN → dashboard data ──
	const recentMatches = await db.query.match.findMany({
		with: { participants: { with: { team: true } } },
		orderBy: desc(match.createdAt),
		limit: 5
	});

	const liveMatches = await db.query.match.findMany({
		with: { participants: { with: { team: true } } },
		where: inArray(match.state, ['LOBBY', 'ROLLING', 'PICKING', 'PLAYING'])
	});

	const [matchCount] = await db.select({ count: count() }).from(match);
	const [teamCount] = await db.select({ count: count() }).from(team);
	const [poolCount] = await db.select({ count: count() }).from(mappool);
	const [finishedCount] = await db
		.select({ count: count() })
		.from(match)
		.where(eq(match.state, 'FINISHED'));

	return {
		authenticated: true as const,
		recentMatches,
		liveMatches,
		stats: {
			matches: matchCount.count,
			finished: finishedCount.count,
			teams: teamCount.count,
			mappools: poolCount.count
		}
	};
};
