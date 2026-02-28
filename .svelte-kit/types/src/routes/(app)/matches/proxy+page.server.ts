// @ts-nocheck
import { db } from '$lib/server/db';
import { match } from '$lib/server/db/schema';
import { redirect } from '@sveltejs/kit';
import { desc } from 'drizzle-orm';
import { createMatch } from '$lib/server/match/engine';
import { initMatchLobby } from '$lib/server/match/orchestrator';
import type { PageServerLoad, Actions } from './$types';

export const load = async ({ locals }: Parameters<PageServerLoad>[0]) => {
	if (!locals.user) redirect(302, '/');

	const matches = await db.query.match.findMany({
		with: { participants: { with: { team: true } } },
		orderBy: desc(match.createdAt),
		limit: 50
	});

	const teams = await db.query.team.findMany({
		orderBy: (t, { asc }) => [asc(t.name)]
	});

	const mappools = await db.query.mappool.findMany({
		with: { slots: true },
		orderBy: (m, { desc }) => [desc(m.createdAt)]
	});

	return { matches, teams, mappools };
};

export const actions = {
	createMatch: async ({ request, locals }: import('./$types').RequestEvent) => {
		if (!locals.user) redirect(302, '/');

		const form = await request.formData();
		const name = form.get('name')?.toString()?.trim() || 'Custom Match';
		const team1Id = form.get('team1')?.toString();
		const team2Id = form.get('team2')?.toString();
		const mappoolId = form.get('mappool')?.toString();
		const bestOf = parseInt(form.get('bestOf')?.toString() ?? '7');

		console.log('[Matches] CREATE:', { name, team1Id, team2Id, mappoolId, bestOf });

		if (!team1Id || !team2Id || !mappoolId) {
			return { error: 'All fields are required' };
		}

		// Same team is allowed for testing/dev

		let result;
		try {
			result = await createMatch({
				name,
				config: { bestOf, teamSize: 1, scoringType: 'score' },
				mappoolId,
				teams: [team1Id, team2Id],
				createdBy: locals.user.id
			});
			console.log('[Matches] Created:', result.id);
		} catch (e: any) {
			console.error('[Matches] Error:', e);
			return { error: e.message };
		}

		// Create IRC lobby in background (don't block redirect)
		initMatchLobby(result.id).catch((err) => {
			console.error('[Matches] IRC lobby failed:', err.message);
		});

		redirect(303, `/matches/${result.id}`);
	}
};
;null as any as Actions;