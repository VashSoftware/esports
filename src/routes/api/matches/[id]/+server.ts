// src/routes/api/matches/[id]/+server.ts
import { json, error } from '@sveltejs/kit';
import { getMatchFull, cancelMatch } from '$lib/server/match/engine';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) error(401, 'Not logged in');

	try {
		const m = await getMatchFull(params.id);
		return json(m);
	} catch (e: any) {
		error(404, e.message);
	}
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) error(401, 'Not logged in');

	try {
		const m = await cancelMatch(params.id);
		return json(m);
	} catch (e: any) {
		error(400, e.message);
	}
};
