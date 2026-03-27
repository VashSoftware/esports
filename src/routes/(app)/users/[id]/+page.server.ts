import { db } from '$lib/server/db';
import { user } from '$lib/server/db/auth.schema';
import {
	playerRating,
	teamMember,
	matchParticipantPlayer,
	profileComment
} from '$lib/server/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/permissions';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const u = await db.query.user.findFirst({
		where: eq(user.id, params.id)
	});
	if (!u) error(404, 'User not found');

	// Player rating
	const rating = await db.query.playerRating.findFirst({
		where: eq(playerRating.userId, params.id)
	});

	// Teams (non-personal)
	const memberships = await db.query.teamMember.findMany({
		where: eq(teamMember.userId, params.id),
		with: { team: true }
	});
	const teams = memberships
		.filter((m) => !m.team.isPersonal)
		.map((m) => ({ id: m.team.id, name: m.team.name, avatarUrl: m.team.avatarUrl, role: m.role }));

	// Recent matches via matchParticipantPlayer
	const playerEntries = await db.query.matchParticipantPlayer.findMany({
		where: eq(matchParticipantPlayer.userId, params.id),
		with: {
			participant: {
				with: {
					match: {
						with: {
							participants: {
								with: { team: true },
								orderBy: (p: any, { asc }: any) => [asc(p.slot)]
							}
						}
					}
				}
			}
		}
	});

	const recentMatches = playerEntries
		.map((pe) => pe.participant.match)
		.filter((m) => m.state === 'FINISHED' || m.state === 'CANCELLED')
		.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
		.slice(0, 20);

	const personalTeam = memberships.find((m) => m.team.isPersonal)?.team;

	// Comments
	const comments = await db.query.profileComment.findMany({
		where: and(eq(profileComment.targetType, 'user'), eq(profileComment.targetId, params.id)),
		with: { author: true },
		orderBy: desc(profileComment.createdAt)
	});

	return {
		profile: {
			id: u.id,
			name: u.name,
			image: u.image,
			role: u.role,
			createdAt: u.createdAt
		},
		rating: rating ? { elo: rating.elo, wins: rating.wins, losses: rating.losses } : null,
		teams,
		recentMatches,
		personalTeamId: personalTeam?.id ?? null,
		comments
	};
};

export const actions: Actions = {
	comment: async ({ params, request, locals }) => {
		const u = requireAuth(locals);
		const form = await request.formData();
		const content = form.get('content')?.toString()?.trim();
		if (!content) return { error: 'Comment cannot be empty' };
		if (content.length > 1000) return { error: 'Comment too long (max 1000 characters)' };

		await db.insert(profileComment).values({
			targetType: 'user',
			targetId: params.id,
			authorId: u.id,
			content
		});

		return { success: true };
	}
};
