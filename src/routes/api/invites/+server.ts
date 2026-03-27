import { json, error } from '@sveltejs/kit';
import { createInvite, getInvitesForUser } from '$lib/server/match/invites';
import { requireAuth } from '$lib/server/permissions';
import { createInviteSchema, parseBody } from '$lib/server/validation';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	const user = requireAuth(locals);
	const invites = await getInvitesForUser(user.id);
	return json(invites);
};

export const POST: RequestHandler = async ({ request, locals }) => {
	const user = requireAuth(locals);

	const body = await request.json();
	const { creatorTeamId, invitedTeamId, config, mappoolId, name, message, scheduledAt } = parseBody(
		createInviteSchema,
		body
	);

	try {
		const invite = await createInvite({
			createdBy: user.id,
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
