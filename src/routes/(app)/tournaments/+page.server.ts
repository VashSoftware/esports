import { db } from '$lib/server/db';
import { tournament } from '$lib/server/db/schema';
import { sql, and, inArray } from 'drizzle-orm';
import {
	parseTableParams,
	buildSearchFilter,
	buildOrderBy,
	buildTableMeta
} from '$lib/server/table';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const params = parseTableParams(url, { sortBy: 'createdAt', limit: 25 });
	const searchFilter = buildSearchFilter(params.search, [tournament.name]);

	// Build filter condition based on ?filter= param
	const filterParam = params.filter;
	let stateFilter;
	if (filterParam === 'upcoming') {
		stateFilter = inArray(tournament.state, ['DRAFT', 'REGISTRATION', 'QUALIFIERS', 'SEEDING']);
	} else if (filterParam === 'ongoing') {
		stateFilter = sql`${tournament.state} = 'BRACKET'`;
	} else if (filterParam === 'finished') {
		stateFilter = sql`${tournament.state} = 'FINISHED'`;
	}

	const where = stateFilter
		? searchFilter
			? and(searchFilter, stateFilter)
			: stateFilter
		: searchFilter;

	const [rows, countResult] = await Promise.all([
		db.query.tournament.findMany({
			with: {
				registrations: {
					columns: { id: true, status: true }
				}
			},
			where,
			orderBy: buildOrderBy(
				params.sortBy,
				params.sortDir,
				{ name: tournament.name, createdAt: tournament.createdAt },
				tournament.createdAt
			),
			limit: params.limit,
			offset: (params.page - 1) * params.limit
		}),
		db
			.select({ count: sql<number>`count(*)` })
			.from(tournament)
			.where(where)
	]);

	return {
		tournaments: rows,
		meta: buildTableMeta(params, Number(countResult[0].count))
	};
};
