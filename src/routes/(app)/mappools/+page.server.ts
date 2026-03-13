import { db } from '$lib/server/db';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { mappool } from '$lib/server/db/schema';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(302, '/');

	const mappools = await db.query.mappool.findMany({ with: { slots: true } });

	const avgSR = (m: (typeof mappools)[0]) =>
		m.slots.length ? m.slots.reduce((s, sl) => s + (sl.starRating ?? 0), 0) / m.slots.length : 0;

	mappools.sort((a, b) => avgSR(b) - avgSR(a));

	return { mappools };
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		if (!locals.user) redirect(302, '/');

		const form = await request.formData();
		const name = form.get('name')?.toString()?.trim();
		if (!name) return { error: 'Name is required' };

		const [created] = await db
			.insert(mappool)
			.values({ name, createdBy: locals.user.id })
			.returning();

		redirect(303, `/mappools/${created.id}`);
	}
};
