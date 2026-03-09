import { json, error } from '@sveltejs/kit';
import { createInvite, getInvitesForUser } from '$lib/server/match/invites';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) error(401, 'Not logged in');
	const invites = await getInvitesForUser(locals.user.id);
	return json(invites);
};

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) error(401, 'Not logged in');

	const body = await request.json();
	const { creatorTeamId, invitedTeamId, config, mappoolId, name, message, scheduledAt } = body;

	if (!creatorTeamId || !invitedTeamId || !config || !mappoolId) {
		error(400, 'Missing required fields');
	}

	try {
		const invite = await createInvite({
			createdBy: locals.user.id,
			creatorTeamId,
			invitedTeamId,
			config,
			mappoolId,
			name,
			message,
			scheduledAt: scheduledAt ? new Date(scheduledAt) : null
		});
		return json(invite, { status: 201 });
	} catch (e: any) {
		error(400, e.message);
	}
};
