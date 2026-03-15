import { db } from '$lib/server/db';
import {
	match,
	matchParticipant,
	matchParticipantPlayer,
	matchGame,
	matchGameScore,
	mappoolSlot,
	teamMember
} from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { MATCH_STATES, GAME_STATES, type MatchConfig } from './types';
import { notifyMatchCreated, notifyMatchFinished } from '$lib/server/discord/client';
import { updateElo } from './rating';
import { getExpectedPicker, getMatchOrThrow, assertState, getMatchFull } from './helpers';
import {
	validateTiebreakerPick,
	determineGameWinner,
	hasRollTie,
	assignPickOrder,
	winsNeeded as calcWinsNeeded
} from './engine-logic';
import { getScoreMultiplier } from '$lib/mods';

export { getMatchFull, getMatchOrThrow };

// ── Create Match ────────────────────────────────────────────────────────

export async function createMatch(opts: {
	name: string;
	config: MatchConfig;
	mappoolId: string;
	teams: string[];
	createdBy: string;
}) {
	const { name, config, mappoolId, teams, createdBy } = opts;

	const [created] = await db
		.insert(match)
		.values({
			name,
			config,
			mappoolId,
			createdBy,
			state: MATCH_STATES.CREATED
		})
		.returning();

	for (let i = 0; i < teams.length; i++) {
		const [participant] = await db
			.insert(matchParticipant)
			.values({
				matchId: created.id,
				teamId: teams[i],
				slot: i + 1
			})
			.returning();

		const members = await db.query.teamMember.findMany({
			where: eq(teamMember.teamId, teams[i])
		});

		for (const member of members) {
			await db.insert(matchParticipantPlayer).values({
				participantId: participant.id,
				userId: member.userId
			});
		}
	}

	const full = await getMatchFull(created.id);
	notifyMatchCreated(full).catch(() => {});
	return full;
}

// ── State Transitions ───────────────────────────────────────────────────

export async function moveToLobby(matchId: string, osuLobbyId?: number) {
	const m = await getMatchOrThrow(matchId);
	assertState(m.state, MATCH_STATES.CREATED);

	await db
		.update(match)
		.set({
			state: MATCH_STATES.LOBBY,
			osuLobbyId: osuLobbyId ?? null,
			startedAt: new Date()
		})
		.where(eq(match.id, matchId));

	return getMatchFull(matchId);
}

export async function moveToRolling(matchId: string) {
	const m = await getMatchOrThrow(matchId);
	assertState(m.state, MATCH_STATES.LOBBY);

	await db.update(match).set({ state: MATCH_STATES.ROLLING }).where(eq(match.id, matchId));

	return getMatchFull(matchId);
}

// ── Roll ────────────────────────────────────────────────────────────────

export async function submitRoll(matchId: string, participantId: string, value: number) {
	const m = await getMatchOrThrow(matchId);
	assertState(m.state, MATCH_STATES.ROLLING);

	await db
		.update(matchParticipant)
		.set({ rollValue: value })
		.where(eq(matchParticipant.id, participantId));

	const participants = await db.query.matchParticipant.findMany({
		where: eq(matchParticipant.matchId, matchId)
	});

	const allRolled = participants.every((p) =>
		p.id === participantId ? true : p.rollValue !== null
	);

	if (allRolled) {
		const finalRolls = participants.map((p) => ({
			...p,
			rollValue: p.id === participantId ? value : p.rollValue!
		}));

		const rollValues = finalRolls.map((p) => p.rollValue);

		if (hasRollTie(rollValues)) {
			// Reset all rolls so everyone must roll again
			for (const p of participants) {
				await db
					.update(matchParticipant)
					.set({ rollValue: null })
					.where(eq(matchParticipant.id, p.id));
			}
			// Stay in ROLLING state
		} else {
			const order = assignPickOrder(finalRolls);

			for (const { participantId, pickOrder } of order) {
				await db
					.update(matchParticipant)
					.set({ pickOrder })
					.where(eq(matchParticipant.id, participantId));
			}

			await db.update(match).set({ state: MATCH_STATES.PICKING }).where(eq(match.id, matchId));
		}
	}

	return getMatchFull(matchId);
}

// ── Pick Map ────────────────────────────────────────────────────────────

export async function pickMap(matchId: string, participantId: string, mappoolSlotId: string) {
	const m = await getMatchOrThrow(matchId);
	assertState(m.state, MATCH_STATES.PICKING);

	const participants = await db.query.matchParticipant.findMany({
		where: eq(matchParticipant.matchId, matchId)
	});

	const totalGames = await db.query.matchGame.findMany({
		where: eq(matchGame.matchId, matchId)
	});

	const expectedPicker = getExpectedPicker(participants, totalGames.length);
	if (expectedPicker.id !== participantId) {
		throw new Error('Not your turn to pick');
	}

	const alreadyPlayed = totalGames.some((g) => g.mappoolSlotId === mappoolSlotId);
	if (alreadyPlayed) {
		throw new Error('This map has already been played');
	}

	// ── Tiebreaker restrictions ──
	const config = m.config as MatchConfig;
	const needed = calcWinsNeeded(config.bestOf);
	const allAtMatchPoint = participants.every((p) => p.score === needed - 1);

	const slot = await db.query.mappoolSlot.findFirst({
		where: eq(mappoolSlot.id, mappoolSlotId)
	});

	if (slot) {
		const tbError = validateTiebreakerPick(slot.category, allAtMatchPoint);
		if (tbError) throw new Error(tbError);
	}

	const [game] = await db
		.insert(matchGame)
		.values({
			matchId,
			gameNumber: totalGames.length + 1,
			mappoolSlotId,
			pickedByParticipantId: participantId,
			state: GAME_STATES.PLAYING,
			startedAt: new Date()
		})
		.returning();

	await db.update(match).set({ state: MATCH_STATES.PLAYING }).where(eq(match.id, matchId));

	return game;
}

// ── Submit Scores ───────────────────────────────────────────────────────

export async function submitGameScores(
	matchGameId: string,
	scores: {
		playerId: string;
		score: number;
		accuracy?: number;
		maxCombo?: number;
		count300?: number;
		count100?: number;
		count50?: number;
		countMiss?: number;
		mods?: string[];
		passed?: boolean;
		pp?: number | null;
	}[]
) {
	const game = await db.query.matchGame.findFirst({
		where: eq(matchGame.id, matchGameId),
		with: { slot: true }
	});

	if (!game) throw new Error('Game not found');
	if (game.state !== GAME_STATES.PLAYING) throw new Error(`Game is ${game.state}, not PLAYING`);

	// Apply score multiplier based on slot mods (e.g. EZ → 2x)
	const slotMods = game.slot?.mods ?? [];
	const multiplier = getScoreMultiplier(slotMods);

	for (const s of scores) {
		await db.insert(matchGameScore).values({
			matchGameId,
			playerId: s.playerId,
			score: multiplier !== 1 ? Math.round(s.score * multiplier) : s.score,
			accuracy: s.accuracy ?? 0,
			maxCombo: s.maxCombo ?? 0,
			count300: s.count300 ?? 0,
			count100: s.count100 ?? 0,
			count50: s.count50 ?? 0,
			countMiss: s.countMiss ?? 0,
			mods: s.mods ?? [],
			passed: s.passed ?? true,
			pp: s.pp ?? null
		});
	}

	const allScores = await db.query.matchGameScore.findMany({
		where: eq(matchGameScore.matchGameId, matchGameId),
		with: { player: true }
	});

	const participantScores = new Map<string, number>();
	for (const s of allScores) {
		const pid = s.player.participantId;
		participantScores.set(pid, (participantScores.get(pid) ?? 0) + s.score);
	}

	const winnerId = determineGameWinner(participantScores);

	await db
		.update(matchGame)
		.set({
			state: GAME_STATES.FINISHED,
			winnerParticipantId: winnerId,
			finishedAt: new Date()
		})
		.where(eq(matchGame.id, matchGameId));

	if (winnerId) {
		const participant = await db.query.matchParticipant.findFirst({
			where: eq(matchParticipant.id, winnerId)
		});
		if (participant) {
			await db
				.update(matchParticipant)
				.set({ score: participant.score + 1 })
				.where(eq(matchParticipant.id, winnerId));
		}
	}

	const m = await getMatchOrThrow(game.matchId);
	const config = m.config as MatchConfig;
	const needed = calcWinsNeeded(config.bestOf);

	const participants = await db.query.matchParticipant.findMany({
		where: eq(matchParticipant.matchId, game.matchId)
	});

	const matchWinner = participants.find((p) => p.score >= needed);

	if (matchWinner) {
		await db
			.update(match)
			.set({
				state: MATCH_STATES.FINISHED,
				winnerId: matchWinner.teamId,
				finishedAt: new Date()
			})
			.where(eq(match.id, game.matchId));

		if (config.allowEloChange !== false) {
			await updateElo(participants, matchWinner.id);
		}

		const finishedMatch = await getMatchFull(game.matchId);
		notifyMatchFinished(finishedMatch).catch(() => {});
	} else {
		await db.update(match).set({ state: MATCH_STATES.PICKING }).where(eq(match.id, game.matchId));
	}

	return getMatchFull(game.matchId);
}

// ── Cancel Match ────────────────────────────────────────────────────────

export async function cancelMatch(matchId: string) {
	await db
		.update(match)
		.set({
			state: MATCH_STATES.CANCELLED,
			finishedAt: new Date()
		})
		.where(eq(match.id, matchId));

	return getMatchFull(matchId);
}
