import { json, error } from '@sveltejs/kit';
import { requireTournamentStaffOrAdmin, TournamentPermission } from '$lib/server/permissions';
import { getTournamentFull } from '$lib/server/tournament/lifecycle';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, locals }) => {
	await requireTournamentStaffOrAdmin(locals, params.id, TournamentPermission.MANAGE_BRACKET);

	const { finalizeQualifiers } = await import('$lib/server/tournament/qualifiers');

	try {
		await finalizeQualifiers(params.id);
		return json(await getTournamentFull(params.id));
	} catch (e: any) {
		error(400, e.message);
	}
};
