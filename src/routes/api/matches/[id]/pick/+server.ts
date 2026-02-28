import { json, error } from '@sveltejs/kit';
import { pickMap } from '$lib/server/match/engine';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.user) error(401, 'Not logged in');

	const { participantId, mappoolSlotId } = await request.json();
	if (!participantId || !mappoolSlotId) {
		error(400, 'participantId and mappoolSlotId required');
	}

	try {
		const game = await pickMap(params.id, participantId, mappoolSlotId);
		return json(game);
	} catch (e) {
		error(400, e.message);
	}
};
