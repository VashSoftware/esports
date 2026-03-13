import { db } from '$lib/server/db';
import { team, teamMember, match, matchParticipant } from '$lib/server/db/schema';
import { user } from '$lib/server/db/auth.schema';
import { eq, and, desc } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/permissions';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	requireAuth(locals);

	const t = await db.query.team.findFirst({
		where: eq(team.id, params.id),
		with: { members: true }
	});

	if (!t) error(404, 'Team not found');

	// Fetch member user details
	const membersWithUsers = await Promise.all(
		t.members.map(async (m) => {
			const usr = await db.query.user.findFirst({
				where: eq(user.id, m.userId)
			});
			return { ...m, user: usr ? { id: usr.id, name: usr.name, image: usr.image } : null };
		})
	);

	// Fetch recent matches for this team
	const participants = await db.query.matchParticipant.findMany({
		where: eq(matchParticipant.teamId, params.id),
		with: {
			match: {
				with: {
					participants: { with: { team: true } }
				}
			}
		}
	});

	const recentMatches = participants
		.map((p) => p.match)
		.filter((m) => m.state === 'FINISHED' || m.state === 'CANCELLED')
		.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
		.slice(0, 20);

	const wins = recentMatches.filter((m) => m.winnerId === params.id).length;
	const losses = recentMatches.filter(
		(m) => m.state === 'FINISHED' && m.winnerId !== params.id
	).length;

	return {
		team: { ...t, members: membersWithUsers },
		recentMatches,
		wins,
		losses
	};
};
