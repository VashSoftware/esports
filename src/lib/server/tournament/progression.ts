import { db } from '$lib/server/db';
import {
	tournament,
	tournamentMatch,
	tournamentRound,
	tournamentGroup,
	tournamentGroupEntry,
	tournamentRegistration,
	match,
	matchParticipant
} from '$lib/server/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { log } from '$lib/server/logger';
import { TOURNAMENT_MATCH_STATES, type TournamentConfig } from './types';
import { generateSingleElimBracket, nextPowerOf2, getRoundName } from './bracket';
import { checkTournamentCompletion } from './lifecycle';

// ── Try Advance Tournament ─────────────────────────────────────────────

export async function tryAdvanceTournament(matchId: string) {
	const tm = await db.query.tournamentMatch.findFirst({
		where: eq(tournamentMatch.matchId, matchId)
	});
	if (!tm) return; // not a tournament match

	const finishedMatch = await db.query.match.findFirst({
		where: eq(match.id, matchId)
	});
	if (!finishedMatch || !finishedMatch.winnerId) return;

	const winnerId = finishedMatch.winnerId;
	const loserId = tm.team1Id === winnerId ? tm.team2Id : tm.team1Id;

	// update tournament match
	await db
		.update(tournamentMatch)
		.set({ state: TOURNAMENT_MATCH_STATES.FINISHED, winnerId })
		.where(eq(tournamentMatch.id, tm.id));

	log.tournament.info(
		{ tournamentId: tm.tournamentId, matchId, winnerId },
		'tournament match finished'
	);

	// get the round to check bracket type
	const round = await db.query.tournamentRound.findFirst({
		where: eq(tournamentRound.id, tm.roundId)
	});

	if (round?.bracketType === 'group') {
		await handleGroupMatchResult(tm.tournamentId, winnerId, loserId, finishedMatch);
		return;
	}

	if (round?.bracketType === 'grand_final') {
		await handleGrandFinalsResult(tm, winnerId, loserId);
		return;
	}

	// standard bracket advancement
	if (tm.winnerGoesToId && winnerId) {
		await advanceTeamToMatch(tm.winnerGoesToId, tm.winnerSlot!, winnerId);
	}

	if (tm.loserGoesToId && loserId) {
		await advanceTeamToMatch(tm.loserGoesToId, tm.loserSlot!, loserId);
	}

	await checkTournamentCompletion(tm.tournamentId);
}

// ── Process BYE Matches ────────────────────────────────────────────────

export async function processByes(tournamentId: string) {
	const byeMatches = await db.query.tournamentMatch.findMany({
		where: and(
			eq(tournamentMatch.tournamentId, tournamentId),
			eq(tournamentMatch.state, TOURNAMENT_MATCH_STATES.BYE)
		)
	});

	for (const tm of byeMatches) {
		const winnerId = tm.team1Id ?? tm.team2Id;
		if (!winnerId) continue;

		// skip if already has a winner (already processed)
		if (tm.winnerId) continue;

		await db.update(tournamentMatch).set({ winnerId }).where(eq(tournamentMatch.id, tm.id));

		if (tm.winnerGoesToId) {
			await advanceTeamToMatch(tm.winnerGoesToId, tm.winnerSlot!, winnerId);
		}

		log.tournament.info({ tournamentId, matchId: tm.id, winnerId }, 'BYE auto-advanced');
	}
}

// ── Handle Team Withdrawal ─────────────────────────────────────────────

export async function handleWithdrawal(tournamentId: string, teamId: string) {
	const teamMatches = await db.query.tournamentMatch.findMany({
		where: and(
			eq(tournamentMatch.tournamentId, tournamentId),
			inArray(tournamentMatch.state, [
				TOURNAMENT_MATCH_STATES.PENDING,
				TOURNAMENT_MATCH_STATES.READY,
				TOURNAMENT_MATCH_STATES.SCHEDULED
			])
		)
	});

	for (const tm of teamMatches) {
		if (tm.team1Id !== teamId && tm.team2Id !== teamId) continue;

		const opponentId = tm.team1Id === teamId ? tm.team2Id : tm.team1Id;

		if (tm.matchId) {
			await db
				.update(match)
				.set({ state: 'CANCELLED', finishedAt: new Date() })
				.where(eq(match.id, tm.matchId));
		}

		if (opponentId) {
			await db
				.update(tournamentMatch)
				.set({ state: TOURNAMENT_MATCH_STATES.FINISHED, winnerId: opponentId })
				.where(eq(tournamentMatch.id, tm.id));

			if (tm.winnerGoesToId) {
				await advanceTeamToMatch(tm.winnerGoesToId, tm.winnerSlot!, opponentId);
			}
		} else {
			await db
				.update(tournamentMatch)
				.set({ state: TOURNAMENT_MATCH_STATES.FINISHED })
				.where(eq(tournamentMatch.id, tm.id));
		}
	}

	await db
		.update(tournamentRegistration)
		.set({ status: 'withdrawn' })
		.where(
			and(
				eq(tournamentRegistration.tournamentId, tournamentId),
				eq(tournamentRegistration.teamId, teamId)
			)
		);

	log.tournament.info({ tournamentId, teamId }, 'team withdrew mid-tournament');
	await checkTournamentCompletion(tournamentId);
}

// ── Internal: Advance Team to Match ────────────────────────────────────

async function advanceTeamToMatch(targetMatchId: string, targetSlot: number, teamId: string) {
	const updates: Record<string, unknown> =
		targetSlot === 1 ? { team1Id: teamId } : { team2Id: teamId };

	await db.update(tournamentMatch).set(updates).where(eq(tournamentMatch.id, targetMatchId));

	// check if both teams are now known → mark as READY
	const updated = await db.query.tournamentMatch.findFirst({
		where: eq(tournamentMatch.id, targetMatchId)
	});

	if (
		updated &&
		updated.team1Id &&
		updated.team2Id &&
		updated.state === TOURNAMENT_MATCH_STATES.PENDING
	) {
		await db
			.update(tournamentMatch)
			.set({ state: TOURNAMENT_MATCH_STATES.READY })
			.where(eq(tournamentMatch.id, targetMatchId));
	}
}

// ── Internal: Handle Group Match Result ────────────────────────────────

async function handleGroupMatchResult(
	tournamentId: string,
	winnerId: string,
	loserId: string | null,
	finishedMatch: typeof match.$inferSelect
) {
	// update group standings
	const groups = await db.query.tournamentGroup.findMany({
		where: eq(tournamentGroup.tournamentId, tournamentId),
		with: { entries: true }
	});

	// get match participant scores for map difference
	const participants = await db.query.matchParticipant.findMany({
		where: eq(matchParticipant.matchId, finishedMatch.id)
	});
	const winnerParticipant = participants.find((p) => p.teamId === winnerId);
	const loserParticipant = loserId ? participants.find((p) => p.teamId === loserId) : null;

	for (const group of groups) {
		const winnerEntry = group.entries.find((e) => e.teamId === winnerId);
		const loserEntry = loserId ? group.entries.find((e) => e.teamId === loserId) : null;

		if (winnerEntry) {
			await db
				.update(tournamentGroupEntry)
				.set({
					wins: winnerEntry.wins + 1,
					mapWins: winnerEntry.mapWins + (winnerParticipant?.score ?? 0),
					mapLosses: winnerEntry.mapLosses + (loserParticipant?.score ?? 0)
				})
				.where(eq(tournamentGroupEntry.id, winnerEntry.id));
		}

		if (loserEntry) {
			await db
				.update(tournamentGroupEntry)
				.set({
					losses: loserEntry.losses + 1,
					mapWins: loserEntry.mapWins + (loserParticipant?.score ?? 0),
					mapLosses: loserEntry.mapLosses + (winnerParticipant?.score ?? 0)
				})
				.where(eq(tournamentGroupEntry.id, loserEntry.id));
		}
	}

	// check if all group matches are finished
	const groupRounds = await db.query.tournamentRound.findMany({
		where: and(
			eq(tournamentRound.tournamentId, tournamentId),
			eq(tournamentRound.bracketType, 'group')
		)
	});
	const groupRoundIds = groupRounds.map((r) => r.id);

	if (groupRoundIds.length === 0) return;

	const allGroupMatches = await db.query.tournamentMatch.findMany({
		where: and(
			eq(tournamentMatch.tournamentId, tournamentId),
			inArray(tournamentMatch.roundId, groupRoundIds)
		)
	});

	const allDone = allGroupMatches.every(
		(m) => m.state === TOURNAMENT_MATCH_STATES.FINISHED || m.state === TOURNAMENT_MATCH_STATES.BYE
	);

	if (allDone) {
		await advanceGroupsToPlayoffs(tournamentId);
	}
}

// ── Internal: Advance Groups to Playoffs ───────────────────────────────

async function advanceGroupsToPlayoffs(tournamentId: string) {
	const t = await db.query.tournament.findFirst({
		where: eq(tournament.id, tournamentId)
	});
	if (!t) return;

	const config = t.config as TournamentConfig;
	const advanceCount = config.groupStage?.advanceCount ?? 2;

	const groups = await db.query.tournamentGroup.findMany({
		where: eq(tournamentGroup.tournamentId, tournamentId),
		with: { entries: true }
	});

	// rank teams and determine who advances
	const advancingTeams: { teamId: string; globalSeed: number }[] = [];
	let seedCounter = 1;

	for (const group of groups) {
		const sorted = [...group.entries].sort((a, b) => {
			if (b.wins !== a.wins) return b.wins - a.wins;
			const aDiff = a.mapWins - a.mapLosses;
			const bDiff = b.mapWins - b.mapLosses;
			return bDiff - aDiff;
		});

		for (const entry of sorted.slice(0, advanceCount)) {
			advancingTeams.push({ teamId: entry.teamId, globalSeed: seedCounter++ });
		}
	}

	// generate playoff bracket
	const seedToTeam = new Map<number, string>();
	for (const t of advancingTeams) {
		seedToTeam.set(t.globalSeed, t.teamId);
	}

	const bracketSlots = generateSingleElimBracket(advancingTeams.length);
	const bracketSize = nextPowerOf2(advancingTeams.length);
	const totalRounds = Math.log2(bracketSize);

	// create playoff rounds
	const rounds: { id: string }[] = [];
	for (let i = 0; i < totalRounds; i++) {
		const matchesInRound = bracketSize / (2 << i);
		const name = getRoundName(matchesInRound, 'winners');

		const [created] = await db
			.insert(tournamentRound)
			.values({
				tournamentId,
				name,
				abbreviation: `PO${i + 1}`,
				roundOrder: 100 + i,
				bestOf: 7,
				bracketType: 'winners'
			})
			.returning();
		rounds.push(created);
	}

	// insert bracket matches
	const slotToMatchId = new Map<string, string>();

	for (const slot of bracketSlots) {
		const round = rounds[slot.roundIndex];
		if (!round) continue;

		const team1Id = slot.team1Seed ? (seedToTeam.get(slot.team1Seed) ?? null) : null;
		const team2Id = slot.team2Seed ? (seedToTeam.get(slot.team2Seed) ?? null) : null;

		let state: string = TOURNAMENT_MATCH_STATES.PENDING;
		if (slot.isBye) state = TOURNAMENT_MATCH_STATES.BYE;
		else if (team1Id && team2Id) state = TOURNAMENT_MATCH_STATES.READY;

		const [created] = await db
			.insert(tournamentMatch)
			.values({
				tournamentId,
				roundId: round.id,
				bracketPosition: slot.bracketPosition,
				team1Id,
				team2Id,
				state
			})
			.returning();

		slotToMatchId.set(`${slot.roundIndex}-${slot.bracketPosition}`, created.id);
	}

	// link progression
	for (const slot of bracketSlots) {
		if (!slot.winnerGoesTo) continue;
		const key = `${slot.roundIndex}-${slot.bracketPosition}`;
		const mid = slotToMatchId.get(key);
		if (!mid) continue;

		const targetKey = `${slot.winnerGoesTo.roundIndex}-${slot.winnerGoesTo.bracketPosition}`;
		const targetId = slotToMatchId.get(targetKey);
		if (!targetId) continue;

		await db
			.update(tournamentMatch)
			.set({ winnerGoesToId: targetId, winnerSlot: slot.winnerGoesTo.slot })
			.where(eq(tournamentMatch.id, mid));
	}

	// process byes
	await processByes(tournamentId);

	log.tournament.info(
		{ tournamentId, teamCount: advancingTeams.length },
		'groups advanced to playoffs'
	);
}

// ── Internal: Handle Grand Finals Result ───────────────────────────────

async function handleGrandFinalsResult(
	tm: typeof tournamentMatch.$inferSelect,
	winnerId: string,
	loserId: string | null
) {
	if (tm.winnerGoesToId) {
		// this is GF1 (has progression to GF2)
		// WB winner is always team1 (slot 1) in GF
		if (winnerId === tm.team1Id) {
			// WB winner won → skip bracket reset, mark GF2 as BYE
			await db
				.update(tournamentMatch)
				.set({ state: TOURNAMENT_MATCH_STATES.BYE as string, winnerId })
				.where(eq(tournamentMatch.id, tm.winnerGoesToId));

			log.tournament.info(
				{ tournamentId: tm.tournamentId, winnerId },
				'WB winner won GF1, skipping bracket reset'
			);
		} else {
			// LB winner won → bracket reset
			await advanceTeamToMatch(tm.winnerGoesToId, 1, winnerId);
			if (loserId) {
				await advanceTeamToMatch(tm.winnerGoesToId, 2, loserId);
			}

			log.tournament.info({ tournamentId: tm.tournamentId }, 'bracket reset activated');
		}
	}

	await checkTournamentCompletion(tm.tournamentId);
}
