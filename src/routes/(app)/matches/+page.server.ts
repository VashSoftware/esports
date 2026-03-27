import { log } from '$lib/server/logger';
import { db } from '$lib/server/db';
import { match, teamMember } from '$lib/server/db/schema';
import { redirect } from '@sveltejs/kit';
import { desc, eq, sql, inArray } from 'drizzle-orm';
import { createMatch } from '$lib/server/match/engine';
import { initMatchLobby } from '$lib/server/match/orchestrator';
import { createInvite } from '$lib/server/match/invites';
import {
	requireAuth,
	requirePermission,
	hasPermission,
	GlobalPermission
} from '$lib/server/permissions';
import { parseTableParams, buildSearchFilter, buildTableMeta } from '$lib/server/table';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const params = parseTableParams(url, { sortBy: 'createdAt', limit: 25 });
	const searchFilter = buildSearchFilter(params.search, [match.name]);

	// Always fetch live matches separately (not paginated)
	const liveStates = ['CREATED', 'LOBBY', 'ROLLING', 'PICKING', 'PLAYING'];

	const [liveMatches, rows, countResult] = await Promise.all([
		db.query.match.findMany({
			columns: {
				id: true,
				name: true,
				state: true,
				config: true,
				createdAt: true,
				finishedAt: true,
				winnerId: true
			},
			with: {
				participants: {
					columns: { teamId: true, score: true, slot: true },
					orderBy: (p, { asc }) => [asc(p.slot)],
					with: { team: { columns: { id: true, name: true, avatarUrl: true } } }
				},
				mappool: { columns: { id: true, name: true } }
			},
			where: inArray(match.state, liveStates),
			orderBy: desc(match.createdAt)
		}),
		db.query.match.findMany({
			columns: {
				id: true,
				name: true,
				state: true,
				config: true,
				createdAt: true,
				finishedAt: true,
				winnerId: true
			},
			with: {
				participants: {
					columns: { teamId: true, score: true, slot: true },
					orderBy: (p, { asc }) => [asc(p.slot)],
					with: { team: { columns: { id: true, name: true, avatarUrl: true } } }
				},
				mappool: { columns: { id: true, name: true } }
			},
			where: searchFilter,
			orderBy: desc(match.createdAt),
			limit: params.limit,
			offset: (params.page - 1) * params.limit
		}),
		db
			.select({ count: sql<number>`count(*)` })
			.from(match)
			.where(searchFilter)
	]);

	return {
		liveMatches,
		matches: rows,
		meta: buildTableMeta(params, Number(countResult[0].count)),
		canCreateMatch: locals.user
			? hasPermission(locals.user.role, GlobalPermission.MATCH_CREATE)
			: false
	};
};

export const actions: Actions = {
	loadCreateFormData: async ({ locals }) => {
		requireAuth(locals);

		const [teams, mappools, userTeamMemberships] = await Promise.all([
			db.query.team.findMany({
				with: { members: true },
				orderBy: (t, { asc }) => [asc(t.name)]
			}),
			db.query.mappool.findMany({
				with: { slots: true },
				orderBy: (m, { desc }) => [desc(m.createdAt)]
			}),
			db.query.teamMember.findMany({
				where: eq(teamMember.userId, locals.user!.id),
				with: { team: true }
			})
		]);

		return {
			teams: teams.map((t) => ({ ...t, memberCount: t.members.length })),
			mappools,
			userTeams: userTeamMemberships.map((m) => m.team)
		};
	},

	createMatch: async ({ request, locals }) => {
		requirePermission(
			locals,
			GlobalPermission.MATCH_CREATE,
			'Only referees and admins can create matches'
		);

		const form = await request.formData();
		const name = form.get('name')?.toString()?.trim() || 'Custom Match';
		const team1Id = form.get('team1')?.toString();
		const team2Id = form.get('team2')?.toString();
		const mappoolId = form.get('mappool')?.toString();
		const bestOf = parseInt(form.get('bestOf')?.toString() ?? '7');

		log.match.info({ name, team1Id, team2Id, mappoolId, bestOf }, 'creating match');

		if (!team1Id || !team2Id || !mappoolId) {
			return { error: 'All fields are required' };
		}

		let result;
		try {
			result = await createMatch({
				name,
				config: { bestOf, teamSize: 1, scoringType: 'score' },
				mappoolId,
				teams: [team1Id, team2Id],
				createdBy: locals.user!.id
			});
			log.match.info({ matchId: result.id }, 'match created');
		} catch (e: any) {
			log.match.error({ err: e }, 'failed to create match');
			return { error: e.message };
		}

		initMatchLobby(result.id).catch((err) => {
			log.match.error({ err, matchId: result.id }, 'IRC lobby failed');
		});

		redirect(303, `/matches/${result.id}`);
	},

	createInvite: async ({ request, locals }) => {
		requireAuth(locals);

		const form = await request.formData();
		const creatorTeamId = form.get('creatorTeamId')?.toString();
		const invitedTeamId = form.get('invitedTeamId')?.toString();
		const mappoolId = form.get('mappool')?.toString();
		const bestOf = parseInt(form.get('bestOf')?.toString() ?? '5');
		const teamSize1 = parseInt(form.get('teamSize1')?.toString() ?? '1');
		const teamSize2 = parseInt(form.get('teamSize2')?.toString() ?? '1');
		const scoringType = (form.get('scoringType')?.toString() ?? 'score_v2') as
			| 'score'
			| 'score_v2'
			| 'accuracy'
			| 'combo';
		const allowEloChange = form.get('allowEloChange') === 'on';
		const message = form.get('message')?.toString()?.trim() || '';
		const scheduledAtStr = form.get('scheduledAt')?.toString();

		if (!creatorTeamId || !invitedTeamId || !mappoolId) {
			return { error: 'All fields are required' };
		}

		if (bestOf < 1 || bestOf % 2 === 0) {
			return { error: 'Best of must be an odd number >= 1' };
		}

		try {
			await createInvite({
				createdBy: locals.user!.id,
				creatorTeamId,
				invitedTeamId,
				config: {
					bestOf,
					teamSize: Math.max(teamSize1, teamSize2),
					teamSizes: [teamSize1, teamSize2],
					scoringType,
					allowEloChange
				},
				mappoolId,
				message: message || undefined,
				scheduledAt: scheduledAtStr ? new Date(scheduledAtStr) : null
			});
			return { inviteSuccess: true };
		} catch (e: any) {
			log.match.error({ err: e }, 'invite creation failed');
			return { error: e.message };
		}
	}
};
