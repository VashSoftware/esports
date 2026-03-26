// src/routes/api/matches/[id]/roll/+server.ts
import { json, error } from '@sveltejs/kit';
import { submitRoll } from '$lib/server/match/engine';
import { requireAuth, hasRole } from '$lib/server/permissions';
import { getMatchFull } from '$lib/server/match/helpers';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, request, locals }) => {
	const user = requireAuth(locals);

	const { value } = await request.json();
	if (value == null) {
		error(400, 'value required');
	}

	const match = await getMatchFull(params.id);

	// Find the participant linked to the authenticated user
	const participant = match.participants.find((p) => p.players.some((pl) => pl.userId === user.id));

	if (!participant && !hasRole(user.role, 'referee')) {
		error(403, 'You are not a participant in this match');
	}

	const participantId = participant?.id;
	if (!participantId) {
		error(400, 'Could not resolve participant');
	}

	try {
		const m = await submitRoll(params.id, participantId, value);
		return json(m);
	} catch (e: any) {
		error(400, e.message);
	}
};
