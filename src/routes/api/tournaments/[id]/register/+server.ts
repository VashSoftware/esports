import { json, error } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/permissions';
import { registerForTournament, withdrawFromTournament } from '$lib/server/tournament/lifecycle';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, request, locals }) => {
	const user = requireAuth(locals);
	const body = await request.json();

	if (!body.teamId) error(400, 'Missing teamId');

	try {
		const reg = await registerForTournament(params.id, body.teamId, user.id);
		return json(reg, { status: 201 });
	} catch (e: any) {
		error(400, e.message);
	}
};

export const DELETE: RequestHandler = async ({ params, request, locals }) => {
	const user = requireAuth(locals);
	const body = await request.json();

	if (!body.teamId) error(400, 'Missing teamId');

	try {
		await withdrawFromTournament(params.id, body.teamId);
		return json({ withdrawn: true });
	} catch (e: any) {
		error(400, e.message);
	}
};
