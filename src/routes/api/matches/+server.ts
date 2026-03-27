// src/routes/api/matches/+server.ts
import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { createMatch } from '$lib/server/match/engine';
import { requireAuth, requirePermission, GlobalPermission } from '$lib/server/permissions';
import { createMatchSchema, parseBody } from '$lib/server/validation';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	requireAuth(locals);

	const matches = await db.query.match.findMany({
		with: {
			participants: { with: { team: true } }
		},
		orderBy: (m, { desc }) => [desc(m.createdAt)]
	});

	return json(matches);
};

export const POST: RequestHandler = async ({ request, locals }) => {
	requirePermission(
		locals,
		GlobalPermission.MATCH_CREATE,
		'Only referees or admins can create matches'
	);

	const body = await request.json();
	const { name, config, mappoolId, teams } = parseBody(createMatchSchema, body);

	try {
		const result = await createMatch({
			name,
			config,
			mappoolId,
			teams,
			createdBy: locals.user!.id
		});
		return json(result, { status: 201 });
	} catch (e: any) {
		error(400, e.message);
	}
};
