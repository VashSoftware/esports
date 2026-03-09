import { db } from '$lib/server/db';
import { match, teamMember } from '$lib/server/db/schema';
import { redirect } from '@sveltejs/kit';
import { desc, eq } from 'drizzle-orm';
import { createMatch } from '$lib/server/match/engine';
import { initMatchLobby } from '$lib/server/match/orchestrator';
import { createInvite } from '$lib/server/match/invites';
import { requireAuth, requireRole, hasRole } from '$lib/server/permissions';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	requireAuth(locals);

	const [matches, teams, mappools, userTeamMemberships] = await Promise.all([
		db.query.match.findMany({
			with: { participants: { with: { team: true } }, mappool: { with: { slots: true } } },
			orderBy: desc(match.createdAt),
			limit: 50
		}),
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
		matches,
		teams: teams.map((t) => ({ ...t, memberCount: t.members.length })),
		mappools,
		userTeams: userTeamMemberships.map((m) => m.team),
		canCreateMatch: hasRole(locals.user!.role, 'referee')
	};
};

export const actions: Actions = {
	createMatch: async ({ request, locals }) => {
		// Only referees and admins can create matches manually
		requireRole(locals, 'referee', 'Only referees and admins can create matches');

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

		let result;
		try {
			result = await createMatch({
				name,
				config: { bestOf, teamSize: 1, scoringType: 'score' },
				mappoolId,
				teams: [team1Id, team2Id],
				createdBy: locals.user!.id
			});
			console.log('[Matches] Created:', result.id);
		} catch (e: any) {
			console.error('[Matches] Error:', e);
			return { error: e.message };
		}

		// Create IRC lobby in background
		initMatchLobby(result.id).catch((err) => {
			console.error('[Matches] IRC lobby failed:', err.message);
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
		const scoringType = (form.get('scoringType')?.toString() ?? 'score_v2') as 'score' | 'score_v2' | 'accuracy' | 'combo';
		const allowEloChange = form.get('allowEloChange') === 'on';
		const message = form.get('message')?.toString()?.trim() || '';
		const scheduledAtStr = form.get('scheduledAt')?.toString();

		if (!creatorTeamId || !invitedTeamId || !mappoolId) {
			return { error: 'All fields are required' };
		}

		// Validate bestOf is odd and >= 1
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
			console.error('[Matches] Invite error:', e);
			return { error: e.message };
		}
	}
};
