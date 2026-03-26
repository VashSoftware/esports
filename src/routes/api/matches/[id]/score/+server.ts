// src/routes/api/matches/[id]/score/+server.ts
import { json, error } from '@sveltejs/kit';
import { submitGameScores } from '$lib/server/match/engine';
import { requireRole } from '$lib/server/permissions';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	requireRole(locals, 'referee', 'Only referees or admins can submit scores');

	const { matchGameId, scores } = await request.json();
	if (!matchGameId || !scores?.length) {
		error(400, 'matchGameId and scores required');
	}

	try {
		const m = await submitGameScores(matchGameId, scores);
		return json(m);
	} catch (e: any) {
		error(400, e.message);
	}
};
