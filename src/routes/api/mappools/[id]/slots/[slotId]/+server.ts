import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { mappool, mappoolSlot } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { requireOwnerOrAdmin } from '$lib/server/permissions';
import type { RequestHandler } from './$types';

export const DELETE: RequestHandler = async ({ params, locals }) => {
	const pool = await db.query.mappool.findFirst({
		where: eq(mappool.id, params.id)
	});

	if (!pool) error(404, 'Mappool not found');

	requireOwnerOrAdmin(
		locals,
		pool.createdBy,
		'Only the mappool creator or an admin can delete slots'
	);

	await db.delete(mappoolSlot).where(eq(mappoolSlot.id, params.slotId));
	return json({ ok: true });
};
