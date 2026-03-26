import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { tournamentMatch, tournamentRound } from '$lib/server/db/schema';
import { eq, asc } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	const rounds = await db.query.tournamentRound.findMany({
		where: eq(tournamentRound.tournamentId, params.id),
		orderBy: [asc(tournamentRound.roundOrder)]
	});

	const matches = await db.query.tournamentMatch.findMany({
		where: eq(tournamentMatch.tournamentId, params.id),
		with: {
			team1: true,
			team2: true,
			winner: true,
			match: {
				with: {
					participants: { with: { team: true } }
				}
			}
		}
	});

	return json({ rounds, matches });
};
