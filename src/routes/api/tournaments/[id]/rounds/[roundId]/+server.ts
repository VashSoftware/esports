import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { tournamentRound, tournamentStaff } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { requireAuth } from '$lib/server/permissions';
import type { RequestHandler } from './$types';

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	const user = requireAuth(locals);

	const staff = await db.query.tournamentStaff.findFirst({
		where: and(eq(tournamentStaff.tournamentId, params.id), eq(tournamentStaff.userId, user.id))
	});
	if (!staff) error(403, 'Not a staff member of this tournament');

	const body = await request.json();
	const updates: Record<string, unknown> = {};

	if (body.name !== undefined) updates.name = body.name;
	if (body.abbreviation !== undefined) updates.abbreviation = body.abbreviation;
	if (body.bestOf !== undefined) updates.bestOf = body.bestOf;
	if (body.mappoolId !== undefined) updates.mappoolId = body.mappoolId;
	if (body.scheduledAt !== undefined)
		updates.scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null;

	if (Object.keys(updates).length === 0) {
		error(400, 'No valid fields to update');
	}

	await db.update(tournamentRound).set(updates).where(eq(tournamentRound.id, params.roundId));

	const updated = await db.query.tournamentRound.findFirst({
		where: eq(tournamentRound.id, params.roundId),
		with: { mappool: { with: { slots: true } } }
	});

	return json(updated);
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	const user = requireAuth(locals);

	const staff = await db.query.tournamentStaff.findFirst({
		where: and(eq(tournamentStaff.tournamentId, params.id), eq(tournamentStaff.userId, user.id))
	});
	if (!staff) error(403, 'Not a staff member of this tournament');

	await db.delete(tournamentRound).where(eq(tournamentRound.id, params.roundId));
	return json({ deleted: true });
};
