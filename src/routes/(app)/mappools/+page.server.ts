import { db } from '$lib/server/db';
import { mappool, mappoolSlot } from '$lib/server/db/schema';
import { sql } from 'drizzle-orm';
import { redirect } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/permissions';
import {
	parseTableParams,
	buildSearchFilter,
	buildOrderBy,
	buildTableMeta
} from '$lib/server/table';
import type { PageServerLoad, Actions } from './$types';

const mapCount = sql<number>`(SELECT count(*) FROM mappool_slot WHERE mappool_id = ${mappool.id})`;
const avgStarRating = sql<number>`(SELECT coalesce(avg(star_rating), 0) FROM mappool_slot WHERE mappool_id = ${mappool.id})`;

export const load: PageServerLoad = async ({ locals, url }) => {
	const params = parseTableParams(url, { sortBy: 'createdAt', limit: 25 });
	const searchFilter = buildSearchFilter(params.search, [mappool.name]);

	const [rows, countResult] = await Promise.all([
		db.query.mappool.findMany({
			with: { slots: true },
			where: searchFilter,
			orderBy: buildOrderBy(
				params.sortBy,
				params.sortDir,
				{
					name: mappool.name,
					createdAt: mappool.createdAt,
					maps: mapCount,
					avgSr: avgStarRating
				},
				mappool.createdAt
			),
			limit: params.limit,
			offset: (params.page - 1) * params.limit
		}),
		db
			.select({ count: sql<number>`count(*)` })
			.from(mappool)
			.where(searchFilter)
	]);

	return {
		mappools: rows,
		meta: buildTableMeta(params, Number(countResult[0].count))
	};
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		requireAuth(locals);

		const form = await request.formData();
		const name = form.get('name')?.toString()?.trim();
		if (!name) return { error: 'Name is required' };

		const [created] = await db
			.insert(mappool)
			.values({ name, createdBy: locals.user!.id })
			.returning();

		redirect(303, `/mappools/${created.id}`);
	}
};
