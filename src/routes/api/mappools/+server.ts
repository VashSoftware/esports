import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { mappool } from '$lib/server/db/schema';
import { requireAuth, requirePermission, GlobalPermission } from '$lib/server/permissions';
import { createMappoolSchema, parseBody } from '$lib/server/validation';
import type { RequestHandler } from './$types';

// List all mappools
export const GET: RequestHandler = async ({ locals }) => {
	requireAuth(locals);

	const mappools = await db.query.mappool.findMany({
		orderBy: (m, { desc }) => [desc(m.createdAt)]
	});

	return json(mappools);
};

// Create a mappool (admin only)
export const POST: RequestHandler = async ({ request, locals }) => {
	requirePermission(
		locals,
		GlobalPermission.MAPPOOL_CREATE,
		'Only authorized users can create mappools'
	);

	const body = await request.json();
	const { name } = parseBody(createMappoolSchema, body);

	const [created] = await db
		.insert(mappool)
		.values({
			name,
			createdBy: locals.user!.id
		})
		.returning();

	return json(created, { status: 201 });
};
