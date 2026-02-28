import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { mappool } from '$lib/server/db/schema';
import type { RequestHandler } from './$types';

// List all mappools
export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) error(401, 'Not logged in');

	const mappools = await db.query.mappool.findMany({
		orderBy: (m, { desc }) => [desc(m.createdAt)]
	});

	return json(mappools);
};

// Create a mappool
export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) error(401, 'Not logged in');

	const { name } = await request.json();
	if (!name?.trim()) error(400, 'Name is required');

	const [created] = await db
		.insert(mappool)
		.values({
			name: name.trim(),
			createdBy: locals.user.id
		})
		.returning();

	return json(created, { status: 201 });
};
