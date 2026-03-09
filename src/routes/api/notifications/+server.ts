import { json, error } from '@sveltejs/kit';
import { getNotifications } from '$lib/server/notifications';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user) error(401, 'Not logged in');

	const limit = parseInt(url.searchParams.get('limit') ?? '50');
	const offset = parseInt(url.searchParams.get('offset') ?? '0');

	const notifications = await getNotifications(locals.user.id, { limit, offset });
	return json(notifications);
};
