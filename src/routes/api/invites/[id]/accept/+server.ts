import { json, error } from '@sveltejs/kit';
import { acceptInvite } from '$lib/server/match/invites';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) error(401, 'Not logged in');

	try {
		const match = await acceptInvite(params.id, locals.user.id);
		return json(match);
	} catch (e: any) {
		error(400, e.message);
	}
};
