import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { tournamentStaff } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { requireAuth } from '$lib/server/permissions';
import { closeRegistration, getTournamentFull } from '$lib/server/tournament/lifecycle';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, locals }) => {
	const user = requireAuth(locals);

	const staff = await db.query.tournamentStaff.findFirst({
		where: and(eq(tournamentStaff.tournamentId, params.id), eq(tournamentStaff.userId, user.id))
	});
	if (!staff) error(403, 'Not a staff member of this tournament');

	try {
		await closeRegistration(params.id);
		return json(await getTournamentFull(params.id));
	} catch (e: any) {
		error(400, e.message);
	}
};
