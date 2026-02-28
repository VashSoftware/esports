import { json, error } from '@sveltejs/kit';
import { moveToRolling } from '$lib/server/match/engine';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) error(401, 'Not logged in');

	try {
		const m = await moveToRolling(params.id);
		return json(m);
	} catch (e) {
		error(400, e.message);
	}
};
