import { db } from '$lib/server/db';
import { match, playerRating, matchQueue } from '$lib/server/db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		return { user: null, rating: null, queueStatus: null, recentMatches: [], poolCount: 0 };
	}

	const rating = await db.query.playerRating.findFirst({
		where: eq(playerRating.userId, locals.user.id)
	});

	const queueEntry = await db.query.matchQueue.findFirst({
		where: eq(matchQueue.userId, locals.user.id)
	});

	const queueCount = await db
		.select({ count: sql<number>`count(*)` })
		.from(matchQueue);

	const poolCount = await db
		.select({ count: sql<number>`count(*)` })
		.from(db._.fullSchema.mappool);

	const recentMatches = await db.query.match.findMany({
		with: {
			participants: {
				with: { team: true, players: true }
			}
		},
		orderBy: desc(match.createdAt),
		limit: 10
	});

	const userMatches = recentMatches.filter((m) =>
		m.participants.some((p) => p.players.some((pl) => pl.userId === locals.user!.id))
	);

	return {
		user: locals.user,
		rating: rating ?? { elo: 1000, wins: 0, losses: 0 },
		queueStatus: {
			inQueue: !!queueEntry,
			queueSize: Number(queueCount[0].count),
			joinedAt: queueEntry?.joinedAt ?? null
		},
		recentMatches: userMatches,
		poolCount: Number(poolCount[0].count)
	};
};
