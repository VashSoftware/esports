import { db } from '$lib/server/db';
import {
	playerRating,
	team,
	matchParticipant,
	matchGameScore,
	matchGame,
	matchParticipantPlayer,
	mappoolSlot,
	match
} from '$lib/server/db/schema';
import { user } from '$lib/server/db/auth.schema';
import { eq, desc, sql, and } from 'drizzle-orm';
import { parseTableParams, buildTableMeta } from '$lib/server/table';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const tab = url.searchParams.get('tab') ?? 'players';
	const params = parseTableParams(url, { sortBy: 'elo', limit: 25 });

	if (tab === 'teams') {
		return loadTeams(params);
	} else if (tab === 'scores') {
		return loadScores(params);
	}
	return loadPlayers(params);
};

async function loadPlayers(params: ReturnType<typeof parseTableParams>) {
	const [rows, countResult] = await Promise.all([
		db
			.select({
				userId: playerRating.userId,
				name: user.name,
				image: user.image,
				elo: playerRating.elo,
				wins: playerRating.wins,
				losses: playerRating.losses
			})
			.from(playerRating)
			.innerJoin(user, eq(playerRating.userId, user.id))
			.orderBy(desc(playerRating.elo))
			.limit(params.limit)
			.offset((params.page - 1) * params.limit),
		db.select({ count: sql<number>`count(*)` }).from(playerRating)
	]);

	const topPlayers = rows.map((r, i) => ({
		...r,
		rank: (params.page - 1) * params.limit + i + 1,
		winRate: r.wins + r.losses > 0 ? ((r.wins / (r.wins + r.losses)) * 100).toFixed(1) : '—'
	}));

	return {
		tab: 'players' as const,
		topPlayers,
		topTeams: [],
		highScores: [],
		meta: buildTableMeta(params, Number(countResult[0].count))
	};
}

async function loadTeams(params: ReturnType<typeof parseTableParams>) {
	// Get teams ranked by match wins, excluding personal teams
	const [rows, countResult] = await Promise.all([
		db
			.select({
				teamId: match.winnerId,
				name: team.name,
				avatarUrl: team.avatarUrl,
				isPersonal: team.isPersonal,
				wins: sql<number>`count(*)`.as('wins'),
				memberCount: sql<number>`(SELECT count(*) FROM team_member WHERE team_id = ${team.id})`
			})
			.from(match)
			.innerJoin(team, eq(match.winnerId, team.id))
			.where(
				and(
					sql`${match.winnerId} IS NOT NULL`,
					eq(match.state, 'FINISHED'),
					eq(team.isPersonal, false)
				)
			)
			.groupBy(match.winnerId, team.id, team.name, team.avatarUrl, team.isPersonal)
			.orderBy(sql`count(*) DESC`)
			.limit(params.limit)
			.offset((params.page - 1) * params.limit),
		db
			.select({ count: sql<number>`count(DISTINCT ${match.winnerId})` })
			.from(match)
			.innerJoin(team, eq(match.winnerId, team.id))
			.where(
				and(
					sql`${match.winnerId} IS NOT NULL`,
					eq(match.state, 'FINISHED'),
					eq(team.isPersonal, false)
				)
			)
	]);

	// Batch-fetch total match counts for these teams
	const teamIds = rows.map((r) => r.teamId).filter(Boolean) as string[];
	const matchCounts: Record<string, number> = {};
	if (teamIds.length > 0) {
		const counts = await db
			.select({
				teamId: matchParticipant.teamId,
				count: sql<number>`count(DISTINCT ${matchParticipant.matchId})`
			})
			.from(matchParticipant)
			.where(
				sql`${matchParticipant.teamId} IN (${sql.join(
					teamIds.map((id) => sql`${id}`),
					sql`, `
				)})`
			)
			.groupBy(matchParticipant.teamId);
		for (const c of counts) {
			matchCounts[c.teamId] = Number(c.count);
		}
	}

	const topTeams = rows.map((r, i) => ({
		rank: (params.page - 1) * params.limit + i + 1,
		teamId: r.teamId,
		name: r.name,
		avatarUrl: r.avatarUrl,
		isPersonal: r.isPersonal,
		memberCount: Number(r.memberCount),
		wins: Number(r.wins),
		totalMatches: matchCounts[r.teamId!] ?? 0
	}));

	return {
		tab: 'teams' as const,
		topPlayers: [],
		topTeams,
		highScores: [],
		meta: buildTableMeta(params, Number(countResult[0].count))
	};
}

async function loadScores(params: ReturnType<typeof parseTableParams>) {
	const [rows, countResult] = await Promise.all([
		db
			.select({
				id: matchGameScore.id,
				score: matchGameScore.score,
				accuracy: matchGameScore.accuracy,
				maxCombo: matchGameScore.maxCombo,
				pp: matchGameScore.pp,
				mods: matchGameScore.mods,
				passed: matchGameScore.passed,
				playerUserId: matchParticipantPlayer.userId,
				playerName: user.name,
				playerImage: user.image,
				mapCategory: mappoolSlot.category,
				mapOrder: mappoolSlot.orderInCategory,
				matchName: match.name,
				matchId: matchGame.matchId
			})
			.from(matchGameScore)
			.innerJoin(matchParticipantPlayer, eq(matchGameScore.playerId, matchParticipantPlayer.id))
			.innerJoin(user, eq(matchParticipantPlayer.userId, user.id))
			.innerJoin(matchGame, eq(matchGameScore.matchGameId, matchGame.id))
			.innerJoin(mappoolSlot, eq(matchGame.mappoolSlotId, mappoolSlot.id))
			.innerJoin(match, eq(matchGame.matchId, match.id))
			.orderBy(sql`${matchGameScore.pp} DESC NULLS LAST`, desc(matchGameScore.score))
			.limit(params.limit)
			.offset((params.page - 1) * params.limit),
		db.select({ count: sql<number>`count(*)` }).from(matchGameScore)
	]);

	const highScores = rows.map((s, i) => ({
		rank: (params.page - 1) * params.limit + i + 1,
		playerUserId: s.playerUserId,
		playerName: s.playerName ?? 'Unknown',
		playerImage: s.playerImage,
		score: s.score,
		accuracy: s.accuracy,
		pp: s.pp,
		mods: s.mods,
		mapCategory: s.mapCategory ?? '',
		mapOrder: s.mapOrder ?? 0,
		matchName: s.matchName ?? 'Match',
		matchId: s.matchId
	}));

	return {
		tab: 'scores' as const,
		topPlayers: [],
		topTeams: [],
		highScores,
		meta: buildTableMeta(params, Number(countResult[0].count))
	};
}
