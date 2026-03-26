import { db } from '$lib/server/db';
import {
	tournament,
	tournamentRegistration,
	tournamentQualifierScore,
	mappool,
	mappoolSlot
} from '$lib/server/db/schema';
import { eq, and, inArray, asc, desc } from 'drizzle-orm';
import { log } from '$lib/server/logger';
import { TOURNAMENT_STATES, type TournamentConfig } from './types';

// ── Submit Qualifier Score ─────────────────────────────────────────────

export async function submitQualifierScore(opts: {
	tournamentId: string;
	teamId: string;
	mappoolSlotId: string;
	totalScore: number;
	accuracy?: number;
}) {
	const t = await db.query.tournament.findFirst({
		where: eq(tournament.id, opts.tournamentId)
	});
	if (!t) throw new Error('Tournament not found');
	if (t.state !== TOURNAMENT_STATES.QUALIFIERS) {
		throw new Error('Tournament is not in qualifiers phase');
	}

	// verify team is registered
	const reg = await db.query.tournamentRegistration.findFirst({
		where: and(
			eq(tournamentRegistration.tournamentId, opts.tournamentId),
			eq(tournamentRegistration.teamId, opts.teamId),
			inArray(tournamentRegistration.status, ['registered', 'confirmed'])
		)
	});
	if (!reg) throw new Error('Team is not registered for this tournament');

	const [score] = await db
		.insert(tournamentQualifierScore)
		.values({
			tournamentId: opts.tournamentId,
			teamId: opts.teamId,
			mappoolSlotId: opts.mappoolSlotId,
			totalScore: opts.totalScore,
			accuracy: opts.accuracy
		})
		.returning();

	log.tournament.info(
		{ tournamentId: opts.tournamentId, teamId: opts.teamId, score: opts.totalScore },
		'qualifier score submitted'
	);

	return score;
}

// ── Get Qualifier Rankings ─────────────────────────────────────────────

export async function getQualifierRankings(tournamentId: string) {
	const scores = await db.query.tournamentQualifierScore.findMany({
		where: eq(tournamentQualifierScore.tournamentId, tournamentId)
	});

	// aggregate total score per team across all maps
	const teamTotals = new Map<string, { totalScore: number; mapCount: number }>();

	for (const score of scores) {
		const existing = teamTotals.get(score.teamId) ?? { totalScore: 0, mapCount: 0 };
		existing.totalScore += score.totalScore;
		existing.mapCount += 1;
		teamTotals.set(score.teamId, existing);
	}

	// rank by total score descending
	const ranked = Array.from(teamTotals.entries())
		.map(([teamId, data]) => ({
			teamId,
			totalScore: data.totalScore,
			mapCount: data.mapCount,
			averageScore: data.mapCount > 0 ? data.totalScore / data.mapCount : 0
		}))
		.sort((a, b) => b.totalScore - a.totalScore);

	return ranked;
}

// ── Finalize Qualifiers ────────────────────────────────────────────────

export async function finalizeQualifiers(tournamentId: string) {
	const t = await db.query.tournament.findFirst({
		where: eq(tournament.id, tournamentId)
	});
	if (!t) throw new Error('Tournament not found');
	if (t.state !== TOURNAMENT_STATES.QUALIFIERS) {
		throw new Error('Tournament is not in qualifiers phase');
	}

	const rankings = await getQualifierRankings(tournamentId);

	// top maxSlots teams qualify, rest are eliminated
	for (let i = 0; i < rankings.length; i++) {
		const isQualified = i < t.maxSlots;

		// update registration with seed and qualifier score
		await db
			.update(tournamentRegistration)
			.set({
				seed: isQualified ? i + 1 : null,
				qualifierScore: rankings[i].totalScore,
				status: isQualified ? 'confirmed' : 'eliminated'
			})
			.where(
				and(
					eq(tournamentRegistration.tournamentId, tournamentId),
					eq(tournamentRegistration.teamId, rankings[i].teamId)
				)
			);
	}

	// move to seeding phase
	await db
		.update(tournament)
		.set({ state: TOURNAMENT_STATES.SEEDING })
		.where(eq(tournament.id, tournamentId));

	log.tournament.info(
		{ tournamentId, qualified: Math.min(rankings.length, t.maxSlots), total: rankings.length },
		'qualifiers finalized'
	);
}

// ── Get Qualifier Mappool ──────────────────────────────────────────────

export async function getQualifierMappool(tournamentId: string) {
	const t = await db.query.tournament.findFirst({
		where: eq(tournament.id, tournamentId)
	});
	if (!t) throw new Error('Tournament not found');

	const config = t.config as TournamentConfig;
	if (!config.qualifiers?.mappoolId) return null;

	return db.query.mappool.findFirst({
		where: eq(mappool.id, config.qualifiers.mappoolId),
		with: { slots: true }
	});
}
