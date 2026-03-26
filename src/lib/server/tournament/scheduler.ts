import { db } from '$lib/server/db';
import { tournament, tournamentMatch, tournamentRound } from '$lib/server/db/schema';
import { eq, and, lte, asc, inArray } from 'drizzle-orm';
import { log } from '$lib/server/logger';
import { TOURNAMENT_MATCH_STATES, TOURNAMENT_STATES, type TournamentConfig } from './types';
import { createMatch } from '$lib/server/match/engine';
import { initMatchLobby } from '$lib/server/match/orchestrator';
import { getActiveLobbyCount } from '$lib/server/bancho/client';
import type { MatchConfig } from '$lib/server/match/types';

const MAX_TOTAL_LOBBIES = 4;
const SCHEDULER_INTERVAL_MS = 30_000; // 30 seconds

let schedulerTimer: ReturnType<typeof setInterval> | null = null;

// ── Start/Stop Scheduler ───────────────────────────────────────────────

export function startTournamentScheduler() {
	if (schedulerTimer) return;

	schedulerTimer = setInterval(() => {
		processTournamentMatchQueue().catch((err) =>
			log.tournament.error({ err }, 'scheduler tick failed')
		);
	}, SCHEDULER_INTERVAL_MS);

	log.tournament.info('tournament scheduler started');
}

export function stopTournamentScheduler() {
	if (schedulerTimer) {
		clearInterval(schedulerTimer);
		schedulerTimer = null;
		log.tournament.info('tournament scheduler stopped');
	}
}

// ── Process Tournament Match Queue ─────────────────────────────────────

export async function processTournamentMatchQueue() {
	// check how many lobby slots are available
	const activeLobbies = getActiveLobbyCount();
	const available = MAX_TOTAL_LOBBIES - activeLobbies;

	if (available <= 0) {
		log.tournament.debug({ activeLobbies }, 'no lobby slots available');
		return;
	}

	// find tournaments in BRACKET state
	const activeTournaments = await db.query.tournament.findMany({
		where: eq(tournament.state, TOURNAMENT_STATES.BRACKET)
	});

	if (activeTournaments.length === 0) return;

	// find READY tournament matches across all active tournaments
	// that are either past their scheduled time or have no scheduled time
	const readyMatches = await db.query.tournamentMatch.findMany({
		where: and(
			inArray(
				tournamentMatch.tournamentId,
				activeTournaments.map((t) => t.id)
			),
			eq(tournamentMatch.state, TOURNAMENT_MATCH_STATES.READY)
		),
		orderBy: [asc(tournamentMatch.scheduledAt)]
	});

	// filter to matches that are ready to start (scheduled time passed or no schedule)
	const now = new Date();
	const eligible = readyMatches.filter((m) => !m.scheduledAt || m.scheduledAt <= now);

	if (eligible.length === 0) return;

	// respect per-tournament concurrency limits
	const tournamentConfigs = new Map<string, TournamentConfig>();
	for (const t of activeTournaments) {
		tournamentConfigs.set(t.id, t.config as TournamentConfig);
	}

	// count currently live matches per tournament
	const liveMatches = await db.query.tournamentMatch.findMany({
		where: and(
			inArray(
				tournamentMatch.tournamentId,
				activeTournaments.map((t) => t.id)
			),
			eq(tournamentMatch.state, TOURNAMENT_MATCH_STATES.LIVE)
		)
	});

	const livePerTournament = new Map<string, number>();
	for (const m of liveMatches) {
		livePerTournament.set(m.tournamentId, (livePerTournament.get(m.tournamentId) ?? 0) + 1);
	}

	let slotsUsed = 0;

	for (const tm of eligible) {
		if (slotsUsed >= available) break;

		const config = tournamentConfigs.get(tm.tournamentId);
		const maxConcurrent = config?.scheduling?.maxConcurrentLobbies ?? 3;
		const currentLive = livePerTournament.get(tm.tournamentId) ?? 0;

		if (currentLive >= maxConcurrent) continue;

		try {
			await startTournamentMatch(tm);
			slotsUsed++;
			livePerTournament.set(tm.tournamentId, currentLive + 1);
		} catch (err) {
			log.tournament.error(
				{ err, tournamentMatchId: tm.id, tournamentId: tm.tournamentId },
				'failed to start tournament match'
			);
		}
	}

	if (slotsUsed > 0) {
		log.tournament.info({ started: slotsUsed }, 'started tournament matches');
	}
}

// ── Start a Single Tournament Match ────────────────────────────────────

async function startTournamentMatch(tm: typeof tournamentMatch.$inferSelect) {
	if (!tm.team1Id || !tm.team2Id) {
		throw new Error('Cannot start match without both teams');
	}

	// get the round for config (bestOf, mappool)
	const round = await db.query.tournamentRound.findFirst({
		where: eq(tournamentRound.id, tm.roundId)
	});
	if (!round) throw new Error('Round not found');

	// get tournament for config
	const t = await db.query.tournament.findFirst({
		where: eq(tournament.id, tm.tournamentId)
	});
	if (!t) throw new Error('Tournament not found');

	const tournamentConfig = t.config as TournamentConfig;

	if (!round.mappoolId) {
		throw new Error(`Round ${round.name} has no mappool assigned`);
	}

	// build match config from tournament + round settings
	const matchConfig: MatchConfig = {
		bestOf: round.bestOf,
		teamSize: tournamentConfig.teamSize,
		scoringType: tournamentConfig.scoringType,
		freemod: tournamentConfig.freemod,
		forceNoFail: tournamentConfig.forceNoFail,
		allowEloChange: false // tournament matches don't affect elo
	};

	// create the actual match using the existing engine
	const matchName = `${t.name} - ${round.name} - Match ${tm.bracketPosition + 1}`;

	const createdMatch = await createMatch({
		name: matchName,
		config: matchConfig,
		mappoolId: round.mappoolId,
		teams: [tm.team1Id, tm.team2Id],
		createdBy: t.createdBy
	});

	// link tournament match to the real match
	await db
		.update(tournamentMatch)
		.set({
			matchId: createdMatch.id,
			state: TOURNAMENT_MATCH_STATES.LIVE as string
		})
		.where(eq(tournamentMatch.id, tm.id));

	// start the IRC lobby
	await initMatchLobby(createdMatch.id);

	log.tournament.info(
		{
			tournamentId: tm.tournamentId,
			tournamentMatchId: tm.id,
			matchId: createdMatch.id,
			round: round.name
		},
		'tournament match started'
	);
}

// ── Schedule Matches for a Round ───────────────────────────────────────

export async function scheduleTournamentMatches(tournamentId: string, roundId?: string) {
	const t = await db.query.tournament.findFirst({
		where: eq(tournament.id, tournamentId)
	});
	if (!t) throw new Error('Tournament not found');

	const config = t.config as TournamentConfig;
	const intervalMs = (config.scheduling?.matchIntervalMinutes ?? 30) * 60 * 1000;

	// get matches to schedule
	const where = roundId
		? and(
				eq(tournamentMatch.tournamentId, tournamentId),
				eq(tournamentMatch.roundId, roundId),
				eq(tournamentMatch.state, TOURNAMENT_MATCH_STATES.READY)
			)
		: and(
				eq(tournamentMatch.tournamentId, tournamentId),
				eq(tournamentMatch.state, TOURNAMENT_MATCH_STATES.READY)
			);

	const matches = await db.query.tournamentMatch.findMany({
		where,
		orderBy: [asc(tournamentMatch.bracketPosition)]
	});

	// get the round's scheduled start time
	const round = roundId
		? await db.query.tournamentRound.findFirst({
				where: eq(tournamentRound.id, roundId)
			})
		: null;

	const baseTime = round?.scheduledAt ?? t.startAt ?? new Date();

	// assign scheduled times with intervals
	for (let i = 0; i < matches.length; i++) {
		const scheduledAt = new Date(baseTime.getTime() + i * intervalMs);
		await db
			.update(tournamentMatch)
			.set({ scheduledAt })
			.where(eq(tournamentMatch.id, matches[i].id));
	}

	log.tournament.info(
		{ tournamentId, roundId, count: matches.length },
		'scheduled tournament matches'
	);
}
