import { db } from '$lib/server/db';
import { tournament } from '$lib/server/db/schema';
import { desc } from 'drizzle-orm';
import { requireAuth } from '$lib/server/permissions';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	requireAuth(locals);

	const tournaments = await db.query.tournament.findMany({
		with: {
			registrations: {
				columns: { id: true, status: true }
			},
			staff: {
				columns: { userId: true, role: true }
			}
		},
		orderBy: desc(tournament.createdAt)
	});

	return { tournaments };
};
