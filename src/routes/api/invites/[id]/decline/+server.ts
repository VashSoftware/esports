import { json, error } from '@sveltejs/kit';
import { declineInvite } from '$lib/server/match/invites';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) error(401, 'Not logged in');

	try {
		await declineInvite(params.id, locals.user.id);
		return json({ success: true });
	} catch (e: any) {
		error(400, e.message);
	}
};
