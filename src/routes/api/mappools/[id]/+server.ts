import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { mappool, mappoolSlot } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

// Get a mappool with its slots
export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) error(401, 'Not logged in');

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
	if (!locals.user) error(401, 'Not logged in');

	await db.delete(mappool).where(eq(mappool.id, params.id));
	return json({ ok: true });
};
