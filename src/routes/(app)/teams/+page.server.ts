import { db } from '$lib/server/db';
import { team, teamMember } from '$lib/server/db/schema';
import { eq, sql, and } from 'drizzle-orm';
import { requireAuth, requireOwnerOrAdmin } from '$lib/server/permissions';
import {
	parseTableParams,
	buildSearchFilter,
	buildOrderBy,
	buildTableMeta
} from '$lib/server/table';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const params = parseTableParams(url, { sortBy: 'createdAt', limit: 25 });
	const searchFilter = buildSearchFilter(params.search, [team.name]);
	// Combine search filter with non-personal filter
	const baseFilter = eq(team.isPersonal, false);
	const where = searchFilter ? and(baseFilter, searchFilter) : baseFilter;

	const [rows, countResult] = await Promise.all([
		db
			.select({
				id: team.id,
				name: team.name,
				isPersonal: team.isPersonal,
				ownerId: team.ownerId,
				avatarUrl: team.avatarUrl,
				createdAt: team.createdAt,
				memberCount: sql<number>`(SELECT count(*) FROM team_member WHERE team_id = ${team.id})`
			})
			.from(team)
			.where(where)
			.orderBy(
				buildOrderBy(
					params.sortBy,
					params.sortDir,
					{ name: team.name, createdAt: team.createdAt },
					team.createdAt
				)
			)
			.limit(params.limit)
			.offset((params.page - 1) * params.limit),
		db
			.select({ count: sql<number>`count(*)` })
			.from(team)
			.where(where)
	]);

	return {
		teams: rows,
		meta: buildTableMeta(params, Number(countResult[0].count)),
		userId: locals.user?.id ?? null
	};
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const u = requireAuth(locals);

		const form = await request.formData();
		const name = form.get('name')?.toString()?.trim();

		if (!name) return { error: 'Team name is required' };

		const [created] = await db
			.insert(team)
			.values({
				name,
				ownerId: u.id,
				isPersonal: false
			})
			.returning();

		await db.insert(teamMember).values({
			teamId: created.id,
			userId: u.id,
			role: 'captain'
		});

		return { success: true };
	},

	rename: async ({ request, locals }) => {
		const form = await request.formData();
		const teamId = form.get('teamId')?.toString();
		const name = form.get('name')?.toString()?.trim();

		if (!teamId || !name) return { error: 'Team ID and name are required' };

		const t = await db.query.team.findFirst({ where: eq(team.id, teamId) });
		if (!t) return { error: 'Team not found' };
		if (t.isPersonal) return { error: 'Cannot rename personal team' };

		requireOwnerOrAdmin(locals, t.ownerId);

		await db.update(team).set({ name }).where(eq(team.id, teamId));
		return { success: true };
	},

	addMember: async ({ request, locals }) => {
		requireAuth(locals);
		const { user } = await import('$lib/server/db/schema');

		const form = await request.formData();
		const teamId = form.get('teamId')?.toString();
		const username = form.get('username')?.toString()?.trim();

		if (!teamId || !username) return { error: 'Team and username are required' };

		const t = await db.query.team.findFirst({ where: eq(team.id, teamId) });
		if (!t) return { error: 'Team not found' };
		requireOwnerOrAdmin(locals, t.ownerId);

		const u = await db.query.user.findFirst({
			where: eq(user.name, username)
		});

		if (!u) return { error: `User "${username}" not found. They need to log in first.` };

		const existing = await db.query.teamMember.findFirst({
			where: (m, { and, eq }) => and(eq(m.teamId, teamId), eq(m.userId, u.id))
		});

		if (existing) return { error: `${username} is already on this team` };

		await db.insert(teamMember).values({
			teamId,
			userId: u.id,
			role: 'member'
		});

		return { success: true };
	},

	removeMember: async ({ request, locals }) => {
		requireAuth(locals);

		const form = await request.formData();
		const memberId = form.get('memberId')?.toString();
		if (!memberId) return { error: 'Missing member ID' };

		const member = await db.query.teamMember.findFirst({
			where: eq(teamMember.id, memberId),
			with: { team: true }
		});
		if (!member) return { error: 'Member not found' };
		requireOwnerOrAdmin(locals, member.team.ownerId);

		await db.delete(teamMember).where(eq(teamMember.id, memberId));
		return { success: true };
	},

	deleteTeam: async ({ request, locals }) => {
		const form = await request.formData();
		const teamId = form.get('teamId')?.toString();
		if (!teamId) return { error: 'Missing team ID' };

		const t = await db.query.team.findFirst({ where: eq(team.id, teamId) });
		if (!t) return { error: 'Team not found' };
		if (t.isPersonal) return { error: 'Cannot delete personal team' };

		requireOwnerOrAdmin(locals, t.ownerId);

		await db.delete(team).where(eq(team.id, teamId));
		return { success: true };
	}
};
