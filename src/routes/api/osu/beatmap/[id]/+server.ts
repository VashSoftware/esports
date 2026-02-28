import { json, error } from '@sveltejs/kit';
import { getBeatmap } from '$lib/server/osu/api';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) error(401, 'Not logged in');

	try {
		const beatmap = await getBeatmap(params.id);
		return json(beatmap);
	} catch {
		error(404, 'Beatmap not found');
	}
};
