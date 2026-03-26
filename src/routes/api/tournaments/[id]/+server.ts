import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { tournament, tournamentStaff } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { requireAuth } from '$lib/server/permissions';
import { getTournamentFull } from '$lib/server/tournament/lifecycle';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	const result = await getTournamentFull(params.id);
	if (!result) error(404, 'Tournament not found');
	return json(result);
};

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	const user = requireAuth(locals);
	await requireTournamentStaff(params.id, user.id);

	const t = await db.query.tournament.findFirst({
		where: eq(tournament.id, params.id)
	});
	if (!t) error(404, 'Tournament not found');
	if (t.state !== 'DRAFT') error(400, 'Can only edit tournaments in DRAFT state');

	const body = await request.json();
	const allowed = [
		'name',
		'description',
		'format',
		'config',
		'maxSlots',
		'bannerUrl',
		'registrationOpenAt',
		'registrationCloseAt',
		'startAt'
	];
	const updates: Record<string, unknown> = {};

	for (const key of allowed) {
		if (body[key] !== undefined) {
			if (key.endsWith('At') && body[key]) {
				updates[key] = new Date(body[key]);
			} else {
				updates[key] = body[key];
			}
		}
	}

	if (Object.keys(updates).length === 0) {
		error(400, 'No valid fields to update');
	}

	await db.update(tournament).set(updates).where(eq(tournament.id, params.id));
	return json(await getTournamentFull(params.id));
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	const user = requireAuth(locals);
	await requireTournamentStaff(params.id, user.id);

	const t = await db.query.tournament.findFirst({
		where: eq(tournament.id, params.id)
	});
	if (!t) error(404, 'Tournament not found');

	if (t.state === 'DRAFT') {
		await db.delete(tournament).where(eq(tournament.id, params.id));
		return json({ deleted: true });
	}

	// for non-draft, cancel instead of delete
	const { cancelTournament } = await import('$lib/server/tournament/lifecycle');
	await cancelTournament(params.id);
	return json(await getTournamentFull(params.id));
};

async function requireTournamentStaff(tournamentId: string, userId: string) {
	const staff = await db.query.tournamentStaff.findFirst({
		where: and(eq(tournamentStaff.tournamentId, tournamentId), eq(tournamentStaff.userId, userId))
	});
	if (!staff) error(403, 'Not a staff member of this tournament');
	return staff;
}
