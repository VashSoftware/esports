import { json, error } from '@sveltejs/kit';
import { markRead, markAllRead } from '$lib/server/notifications';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) error(401, 'Not logged in');

	const body = await request.json();

	if (body.all) {
		await markAllRead(locals.user.id);
	} else if (body.notificationId) {
		await markRead(body.notificationId, locals.user.id);
	} else {
		error(400, 'Provide notificationId or { all: true }');
	}

	return json({ success: true });
};
