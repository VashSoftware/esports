// src/routes/api/matches/[id]/pick/+server.ts
import { json, error } from '@sveltejs/kit';
import { pickMap } from '$lib/server/match/engine';
import { requireAuth, hasPermission, GlobalPermission } from '$lib/server/permissions';
import { getMatchFull } from '$lib/server/match/helpers';
import { pickMapSchema, parseBody } from '$lib/server/validation';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, request, locals }) => {
	const user = requireAuth(locals);

	const body = await request.json();
	const { mappoolSlotId } = parseBody(pickMapSchema, body);

	const match = await getMatchFull(params.id);

	// Find the participant linked to the authenticated user
	const participant = match.participants.find((p) => p.players.some((pl) => pl.userId === user.id));

	if (!participant && !hasPermission(user.role, GlobalPermission.MATCH_REFEREE)) {
		error(403, 'You are not a participant in this match');
	}

	const participantId = participant?.id;
	if (!participantId) {
		error(400, 'Could not resolve participant');
	}

	try {
		const game = await pickMap(params.id, participantId, mappoolSlotId);
		return json(game);
	} catch (e: any) {
		error(400, e.message);
	}
};
