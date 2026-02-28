import { db } from '$lib/server/db';
import { team, teamMember, user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { redirect } from '@sveltejs/kit';
import { requireAuth, requireOwnerOrAdmin } from '$lib/server/permissions';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const u = requireAuth(locals);

	const teams = await db.query.team.findMany({
		with: {
			members: true
		},
		orderBy: (t, { desc }) => [desc(t.createdAt)]
	});

	// Fetch member user details
	const teamsWithUsers = await Promise.all(
		teams.map(async (t) => {
			const membersWithUsers = await Promise.all(
				t.members.map(async (m) => {
					const usr = await db.query.user.findFirst({
						where: eq(user.id, m.userId)
					});
					return { ...m, user: usr ? { id: usr.id, name: usr.name, image: usr.image } : null };
				})
			);
			return { ...t, members: membersWithUsers };
		})
	);

	return { teams: teamsWithUsers, userId: u.id };
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

		// Add creator as captain
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

		const form = await request.formData();
		const teamId = form.get('teamId')?.toString();
		const username = form.get('username')?.toString()?.trim();

		if (!teamId || !username) return { error: 'Team and username are required' };

		// Only owner or admin can add members
		const t = await db.query.team.findFirst({ where: eq(team.id, teamId) });
		if (!t) return { error: 'Team not found' };
		requireOwnerOrAdmin(locals, t.ownerId);

		// Find user by osu! username
		const u = await db.query.user.findFirst({
			where: eq(user.name, username)
		});

		if (!u) return { error: `User "${username}" not found. They need to log in first.` };

		// Check not already member
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

		// Look up the member to find the team, then check ownership
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
