import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { tournamentMatch } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	const matches = await db.query.tournamentMatch.findMany({
		where: eq(tournamentMatch.tournamentId, params.id),
		with: {
			round: true,
			team1: true,
			team2: true,
			winner: true,
			match: {
				with: {
					participants: { with: { team: true } },
					games: { with: { slot: true } }
				}
			}
		}
	});

	return json(matches);
};
