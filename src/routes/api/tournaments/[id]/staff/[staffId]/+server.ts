import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { tournamentStaff } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { requireAuth } from '$lib/server/permissions';
import type { RequestHandler } from './$types';

export const DELETE: RequestHandler = async ({ params, locals }) => {
	const user = requireAuth(locals);

	const actor = await db.query.tournamentStaff.findFirst({
		where: and(eq(tournamentStaff.tournamentId, params.id), eq(tournamentStaff.userId, user.id))
	});
	if (!actor || (actor.role !== 'organizer' && actor.role !== 'admin')) {
		error(403, 'Only organizers can manage staff');
	}

	await db.delete(tournamentStaff).where(eq(tournamentStaff.id, params.staffId));
	return json({ deleted: true });
};
