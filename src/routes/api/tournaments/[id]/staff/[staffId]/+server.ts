import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { tournamentStaff } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { requireTournamentStaffOrAdmin, TournamentPermission } from '$lib/server/permissions';
import type { RequestHandler } from './$types';

export const DELETE: RequestHandler = async ({ params, locals }) => {
	await requireTournamentStaffOrAdmin(locals, params.id, TournamentPermission.MANAGE_STAFF);
	await db.delete(tournamentStaff).where(eq(tournamentStaff.id, params.staffId));
	return json({ deleted: true });
};
