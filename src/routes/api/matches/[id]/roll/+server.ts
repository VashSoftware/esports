// src/routes/api/matches/[id]/roll/+server.ts
import { json, error } from '@sveltejs/kit';
import { submitRoll } from '$lib/server/match/engine';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.user) error(401, 'Not logged in');

	const { participantId, value } = await request.json();
	if (!participantId || value == null) {
		error(400, 'participantId and value required');
	}

	try {
		const m = await submitRoll(params.id, participantId, value);
		return json(m);
	} catch (e: any) {
		error(400, e.message);
	}
};
