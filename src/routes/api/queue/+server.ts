// src/routes/api/queue/+server.ts
import { json, error } from '@sveltejs/kit';
import { joinQueue, leaveQueue, getQueueStatus } from '$lib/server/match/engine';
import { db } from '$lib/server/db';
import { teamMember } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) error(401, 'Not logged in');

	const status = await getQueueStatus(locals.user.id);
	return json(status);
};

export const POST: RequestHandler = async ({ locals }) => {
	if (!locals.user) error(401, 'Not logged in');

	// Find user's personal team
	const membership = await db.query.teamMember.findFirst({
		where: eq(teamMember.userId, locals.user.id),
		with: { team: true }
	});

	const personalTeam = membership?.team;
	if (!personalTeam?.isPersonal) {
		error(400, 'No personal team found');
	}

	try {
		const result = await joinQueue(locals.user.id, personalTeam.id);
		return json({ matched: !!result, match: result });
	} catch (e: any) {
		error(400, e.message);
	}
};

export const DELETE: RequestHandler = async ({ locals }) => {
	if (!locals.user) error(401, 'Not logged in');

	await leaveQueue(locals.user.id);
	return json({ ok: true });
};
