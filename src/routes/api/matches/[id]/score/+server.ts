// src/routes/api/matches/[id]/score/+server.ts
import { json, error } from '@sveltejs/kit';
import { submitGameScores } from '$lib/server/match/engine';
import { requirePermission, GlobalPermission } from '$lib/server/permissions';
import { submitScoreSchema, parseBody } from '$lib/server/validation';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	requirePermission(
		locals,
		GlobalPermission.MATCH_REFEREE,
		'Only referees or admins can submit scores'
	);

	const body = await request.json();
	const { matchGameId, scores } = parseBody(submitScoreSchema, body);

	try {
		const m = await submitGameScores(matchGameId, scores);
		return json(m);
	} catch (e: any) {
		error(400, e.message);
	}
};
