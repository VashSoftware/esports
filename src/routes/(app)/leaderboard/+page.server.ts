import { db } from '$lib/server/db';
import {
	playerRating,
	team,
	teamMember,
	matchParticipant,
	matchGameScore,
	matchGame,
	matchParticipantPlayer,
	match
} from '$lib/server/db/schema';
import { user } from '$lib/server/db/auth.schema';
import { eq, desc, sql, and } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	// ── Top players by ELO ──
	const topPlayers = await db.query.playerRating.findMany({
		orderBy: desc(playerRating.elo),
		limit: 25
	});

	const playersWithUsers = await Promise.all(
		topPlayers.map(async (r, i) => {
			const u = await db.query.user.findFirst({
				where: eq(user.id, r.userId)
			});
			return {
				rank: i + 1,
				userId: r.userId,
				name: u?.name ?? 'Unknown',
				image: u?.image ?? null,
				elo: r.elo,
				wins: r.wins,
				losses: r.losses,
				winRate:
					r.wins + r.losses > 0
						? ((r.wins / (r.wins + r.losses)) * 100).toFixed(1)
						: '—'
			};
		})
	);

	// ── Top teams by match wins ──
	// Count wins for each team from matchParticipant scores
	const teamWins = await db
		.select({
			teamId: match.winnerId,
			wins: sql<number>`count(*)`.as('wins')
		})
		.from(match)
		.where(and(
			sql`${match.winnerId} IS NOT NULL`,
			eq(match.state, 'FINISHED')
		))
		.groupBy(match.winnerId)
		.orderBy(sql`count(*) DESC`)
		.limit(15);

	const teamsWithDetails = await Promise.all(
		teamWins.map(async (tw, i) => {
			if (!tw.teamId) return null;
			const t = await db.query.team.findFirst({
				where: eq(team.id, tw.teamId),
				with: { members: true }
			});
			if (!t) return null;

			// Count total matches for this team
			const totalMatches = await db
				.select({ count: sql<number>`count(DISTINCT ${matchParticipant.matchId})` })
				.from(matchParticipant)
				.where(eq(matchParticipant.teamId, tw.teamId));

			return {
				rank: i + 1,
				teamId: t.id,
				name: t.name,
				avatarUrl: t.avatarUrl,
				isPersonal: t.isPersonal,
				memberCount: t.members.length,
				wins: Number(tw.wins),
				totalMatches: Number(totalMatches[0]?.count ?? 0)
			};
		})
	);

	const topTeams = teamsWithDetails.filter(Boolean);

	// ── Recent high scores (individual map scores) ──
	const recentHighScores = await db.query.matchGameScore.findMany({
		orderBy: desc(matchGameScore.score),
		limit: 15,
		with: {
			player: true,
			game: {
				with: {
					slot: true,
					match: true
				}
			}
		}
	});

	const highScoresWithNames = await Promise.all(
		recentHighScores.map(async (s, i) => {
			const u = await db.query.user.findFirst({
				where: eq(user.id, s.player.userId)
			});
			return {
				rank: i + 1,
				playerName: u?.name ?? 'Unknown',
				playerImage: u?.image ?? null,
				score: s.score,
				accuracy: s.accuracy,
				maxCombo: s.maxCombo,
				mods: s.mods,
				passed: s.passed,
				beatmapId: s.game.slot?.beatmapId ?? null,
				mapCategory: s.game.slot?.category ?? '',
				mapOrder: s.game.slot?.orderInCategory ?? 0,
				matchName: s.game.match?.name ?? 'Match',
				matchId: s.game.matchId
			};
		})
	);

	return {
		topPlayers: playersWithUsers,
		topTeams: topTeams,
		highScores: highScoresWithNames
	};
};
