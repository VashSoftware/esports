import { json, error } from '@sveltejs/kit';
import { getUnreadCount } from '$lib/server/notifications';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) error(401, 'Not logged in');
	const count = await getUnreadCount(locals.user.id);
	return json({ count });
};
