import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { mappool, mappoolSlot } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { requireAuth, requireOwnerOrAdmin } from '$lib/server/permissions';
import type { RequestHandler } from './$types';

// Get a mappool with its slots
export const GET: RequestHandler = async ({ params, locals }) => {
	requireAuth(locals);

	const pool = await db.query.mappool.findFirst({
		where: eq(mappool.id, params.id)
	});

	if (!pool) error(404, 'Mappool not found');

	const slots = await db.query.mappoolSlot.findMany({
		where: eq(mappoolSlot.mappoolId, params.id),
		orderBy: (s, { asc }) => [asc(s.category), asc(s.orderInCategory)]
	});

	return json({ ...pool, slots });
};

// Delete a mappool
export const DELETE: RequestHandler = async ({ params, locals }) => {
	const pool = await db.query.mappool.findFirst({
		where: eq(mappool.id, params.id)
	});

	if (!pool) error(404, 'Mappool not found');

	requireOwnerOrAdmin(
		locals,
		pool.createdBy,
		'Only the mappool creator or an admin can delete this'
	);

	await db.delete(mappool).where(eq(mappool.id, params.id));
	return json({ ok: true });
};
