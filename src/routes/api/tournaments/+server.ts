import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { tournament } from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';
import { requireAuth } from '$lib/server/permissions';
import { createTournament } from '$lib/server/tournament/lifecycle';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const state = url.searchParams.get('state');
	const format = url.searchParams.get('format');

	const query = db.query.tournament.findMany({
		with: {
			registrations: true,
			staff: true
		},
		orderBy: [desc(tournament.createdAt)]
	});

	const results = await query;

	// filter in memory (drizzle doesn't support dynamic where chaining easily)
	let filtered = results;
	if (state) filtered = filtered.filter((t) => t.state === state);
	if (format) filtered = filtered.filter((t) => t.format === format);

	return json(filtered);
};

export const POST: RequestHandler = async ({ request, locals }) => {
	const user = requireAuth(locals);
	const body = await request.json();

	const {
		name,
		description,
		format,
		config,
		maxSlots,
		bannerUrl,
		registrationOpenAt,
		registrationCloseAt,
		startAt
	} = body;

	if (!name || !format || !config || !maxSlots) {
		error(400, 'Missing required fields: name, format, config, maxSlots');
	}

	if (!['single_elim', 'double_elim', 'groups_bracket'].includes(format)) {
		error(400, 'Invalid format. Must be single_elim, double_elim, or groups_bracket');
	}

	if (!config.teamSize || !config.scoringType) {
		error(400, 'Config must include teamSize and scoringType');
	}

	try {
		const result = await createTournament({
			name,
			description,
			format,
			config,
			maxSlots,
			bannerUrl,
			createdBy: user.id,
			registrationOpenAt: registrationOpenAt ? new Date(registrationOpenAt) : undefined,
			registrationCloseAt: registrationCloseAt ? new Date(registrationCloseAt) : undefined,
			startAt: startAt ? new Date(startAt) : undefined
		});
		return json(result, { status: 201 });
	} catch (e: any) {
		error(400, e.message);
	}
};
