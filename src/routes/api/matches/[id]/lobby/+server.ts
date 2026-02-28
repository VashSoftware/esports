import { json, error } from '@sveltejs/kit';
import { moveToLobby } from '$lib/server/match/engine';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.user) error(401, 'Not logged in');

	const body = await request.json().catch(() => ({}));

	try {
		const m = await moveToLobby(params.id, body.osuLobbyId);
		return json(m);
	} catch (e) {
		error(400, e.message);
	}
};
