// @ts-nocheck
import { db } from '$lib/server/db';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { mappool } from '$lib/server/db/schema';

export const load = async ({ locals }: Parameters<PageServerLoad>[0]) => {
	if (!locals.user) redirect(302, '/');

	const mappools = await db.query.mappool.findMany({
		with: { slots: true },
		orderBy: (m, { desc }) => [desc(m.createdAt)]
	});

	return { mappools };
};

export const actions = {
	create: async ({ request, locals }: import('./$types').RequestEvent) => {
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
;null as any as Actions;