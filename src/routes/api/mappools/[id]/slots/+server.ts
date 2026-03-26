import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { mappool, mappoolSlot } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { requireOwnerOrAdmin } from '$lib/server/permissions';
import type { RequestHandler } from './$types';

// Add a slot to a mappool
export const POST: RequestHandler = async ({ params, request, locals }) => {
	const pool = await db.query.mappool.findFirst({
		where: eq(mappool.id, params.id)
	});

	if (!pool) error(404, 'Mappool not found');

	requireOwnerOrAdmin(locals, pool.createdBy, 'Only the mappool creator or an admin can add slots');

	const { beatmapId, category, mods } = await request.json();

	if (!beatmapId || !category) {
		error(400, 'beatmapId and category are required');
	}

	// Count existing slots in this category to auto-increment order
	const existing = await db.query.mappoolSlot.findMany({
		where: and(
			eq(mappoolSlot.mappoolId, params.id),
			eq(mappoolSlot.category, category.toUpperCase())
		)
	});

	const [created] = await db
		.insert(mappoolSlot)
		.values({
			mappoolId: params.id,
			beatmapId: String(beatmapId),
			category: category.toUpperCase(),
			orderInCategory: existing.length + 1,
			mods: mods ?? []
		})
		.returning();

	return json(created, { status: 201 });
};
