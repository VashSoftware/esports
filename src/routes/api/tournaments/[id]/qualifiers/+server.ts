import { json, error } from '@sveltejs/kit';
import {
	getQualifierRankings,
	getQualifierMappool,
	submitQualifierScore
} from '$lib/server/tournament/qualifiers';
import { db } from '$lib/server/db';
import { tournamentStaff } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { requireAuth } from '$lib/server/permissions';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	const [rankings, mappool] = await Promise.all([
		getQualifierRankings(params.id),
		getQualifierMappool(params.id)
	]);

	return json({ rankings, mappool });
};

export const POST: RequestHandler = async ({ params, request, locals }) => {
	const user = requireAuth(locals);

	// only staff can submit qualifier scores (referees run qualifier lobbies)
	const staff = await db.query.tournamentStaff.findFirst({
		where: and(eq(tournamentStaff.tournamentId, params.id), eq(tournamentStaff.userId, user.id))
	});
	if (!staff) error(403, 'Only tournament staff can submit qualifier scores');

	const body = await request.json();
	const { teamId, mappoolSlotId, totalScore, accuracy } = body;

	if (!teamId || !mappoolSlotId || totalScore === undefined) {
		error(400, 'Missing required fields: teamId, mappoolSlotId, totalScore');
	}

	try {
		const score = await submitQualifierScore({
			tournamentId: params.id,
			teamId,
			mappoolSlotId,
			totalScore,
			accuracy
		});
		return json(score, { status: 201 });
	} catch (e: any) {
		error(400, e.message);
	}
};
