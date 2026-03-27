// src/routes/api/matches/[id]/lobby/+server.ts
import { json, error } from '@sveltejs/kit';
import { moveToLobby } from '$lib/server/match/engine';
import { requirePermission, GlobalPermission } from '$lib/server/permissions';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, request, locals }) => {
	requirePermission(
		locals,
		GlobalPermission.MATCH_REFEREE,
		'Only referees or admins can move matches to lobby'
	);

	const body = await request.json().catch(() => ({}));

	try {
		const m = await moveToLobby(params.id, body.osuLobbyId);
		return json(m);
	} catch (e: any) {
		error(400, e.message);
	}
};
