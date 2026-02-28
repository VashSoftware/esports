import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { mappoolSlot } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const DELETE: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) error(401, 'Not logged in');

	await db.delete(mappoolSlot).where(eq(mappoolSlot.id, params.slotId));
	return json({ ok: true });
};
