import { json, error } from '@sveltejs/kit';
import {
	getQualifierRankings,
	getQualifierMappool,
	submitQualifierScore
} from '$lib/server/tournament/qualifiers';
import { requireTournamentStaffOrAdmin, TournamentPermission } from '$lib/server/permissions';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	const [rankings, mappool] = await Promise.all([
		getQualifierRankings(params.id),
		getQualifierMappool(params.id)
	]);

	return json({ rankings, mappool });
};

export const POST: RequestHandler = async ({ params, request, locals }) => {
	await requireTournamentStaffOrAdmin(locals, params.id, TournamentPermission.REFEREE_MATCHES);

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
