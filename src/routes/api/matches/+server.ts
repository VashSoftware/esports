// src/routes/api/matches/+server.ts
import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { createMatch } from '$lib/server/match/engine';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) error(401, 'Not logged in');

	const matches = await db.query.match.findMany({
		with: {
			participants: { with: { team: true } }
		},
		orderBy: (m, { desc }) => [desc(m.createdAt)]
	});

	return json(matches);
};

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) error(401, 'Not logged in');

	const body = await request.json();
	const { name, config, mappoolId, teams } = body;

	if (!name || !config || !mappoolId || !teams?.length) {
		error(400, 'Missing required fields');
	}

	try {
		const result = await createMatch({
			name,
			config,
			mappoolId,
			teams,
			createdBy: locals.user.id
		});
		return json(result, { status: 201 });
	} catch (e: any) {
		error(400, e.message);
	}
};
