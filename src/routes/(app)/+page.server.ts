// src/routes/(app)/+page.server.ts
import { db } from '$lib/server/db';
import { match, team, mappool, tournament } from '$lib/server/db/schema';
import { eq, desc, count, inArray } from 'drizzle-orm';
import { user } from '$lib/server/db/auth.schema';
import { getQueueStatus } from '$lib/server/match/queue';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	// ── NOT LOGGED IN → landing page (no redirect loop!) ──
	if (!locals.user) {
		return {
			authenticated: false as const,
			recentMatches: [],
			liveMatches: [],
			stats: { completed: 0, tournaments: 0, usersAndTeams: 0, mappools: 0 }
		};
	}

	// ── LOGGED IN → dashboard data ──
	const [
		recentMatches,
		liveMatches,
		[finishedCount],
		[tournamentCount],
		[userCount],
		[teamCount],
		[poolCount],
		queueStatus
	] = await Promise.all([
		db.query.match.findMany({
			with: { participants: { with: { team: true } }, mappool: { with: { slots: true } } },
			orderBy: desc(match.createdAt),
			limit: 5
		}),
		db.query.match.findMany({
			with: { participants: { with: { team: true } }, mappool: { with: { slots: true } } },
			where: inArray(match.state, ['LOBBY', 'ROLLING', 'PICKING', 'PLAYING'])
		}),
		db.select({ count: count() }).from(match).where(eq(match.state, 'FINISHED')),
		db.select({ count: count() }).from(tournament),
		db.select({ count: count() }).from(user),
		db.select({ count: count() }).from(team),
		db.select({ count: count() }).from(mappool),
		getQueueStatus(locals.user.id)
	]);

	return {
		authenticated: true as const,
		recentMatches,
		liveMatches,
		hasActiveMatch: !!queueStatus.matchedMatchId,
		activeMatchId: queueStatus.matchedMatchId ?? null,
		stats: {
			completed: finishedCount.count,
			tournaments: tournamentCount.count,
			usersAndTeams: userCount.count + teamCount.count,
			mappools: poolCount.count
		}
	};
};
