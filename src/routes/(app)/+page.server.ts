import { db } from '$lib/server/db';
import { match, team, mappool } from '$lib/server/db/schema';
import { eq, desc, count, and, inArray } from 'drizzle-orm';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(302, '/');

	// Recent matches (last 5)
	const recentMatches = await db.query.match.findMany({
		with: { participants: { with: { team: true } } },
		orderBy: desc(match.createdAt),
		limit: 5
	});

	// Live matches
	const liveMatches = await db.query.match.findMany({
		with: { participants: { with: { team: true } } },
		where: inArray(match.state, ['LOBBY', 'ROLLING', 'PICKING', 'PLAYING'])
	});

	// Counts
	const [matchCount] = await db.select({ count: count() }).from(match);
	const [teamCount] = await db.select({ count: count() }).from(team);
	const [poolCount] = await db.select({ count: count() }).from(mappool);
	const [finishedCount] = await db
		.select({ count: count() })
		.from(match)
		.where(eq(match.state, 'FINISHED'));

	return {
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
