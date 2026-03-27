import { json, error } from '@sveltejs/kit';
import { requireTournamentStaffOrAdmin, TournamentPermission } from '$lib/server/permissions';
import { openRegistration, getTournamentFull } from '$lib/server/tournament/lifecycle';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, locals }) => {
	await requireTournamentStaffOrAdmin(locals, params.id, TournamentPermission.MANAGE_REGISTRATIONS);

	try {
		await openRegistration(params.id);
		return json(await getTournamentFull(params.id));
	} catch (e: any) {
		error(400, e.message);
	}
};
