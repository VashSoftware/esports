// src/routes/api/matches/[id]/rolling/+server.ts
import { json, error } from '@sveltejs/kit';
import { moveToRolling } from '$lib/server/match/engine';
import { requireRole } from '$lib/server/permissions';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, locals }) => {
	requireRole(locals, 'referee', 'Only referees or admins can move matches to rolling');

	try {
		const m = await moveToRolling(params.id);
		return json(m);
	} catch (e: any) {
		error(400, e.message);
	}
};
