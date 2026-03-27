import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { tournamentRound } from '$lib/server/db/schema';
import { eq, asc } from 'drizzle-orm';
import { requireTournamentStaffOrAdmin, TournamentPermission } from '$lib/server/permissions';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	const rounds = await db.query.tournamentRound.findMany({
		where: eq(tournamentRound.tournamentId, params.id),
		with: { mappool: { with: { slots: true } } },
		orderBy: [asc(tournamentRound.roundOrder)]
	});
	return json(rounds);
};

export const POST: RequestHandler = async ({ params, request, locals }) => {
	await requireTournamentStaffOrAdmin(locals, params.id, TournamentPermission.MANAGE_ROUNDS);

	const body = await request.json();
	const { name, abbreviation, bestOf, mappoolId, bracketType, scheduledAt } = body;

	if (!name || !bestOf) error(400, 'Missing required fields: name, bestOf');

	const existing = await db.query.tournamentRound.findMany({
		where: eq(tournamentRound.tournamentId, params.id)
	});

	const [created] = await db
		.insert(tournamentRound)
		.values({
			tournamentId: params.id,
			name,
			abbreviation,
			roundOrder: existing.length,
			bestOf,
			mappoolId,
			bracketType,
			scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined
		})
		.returning();

	return json(created, { status: 201 });
};
