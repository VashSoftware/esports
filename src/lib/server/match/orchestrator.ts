import { db } from '$lib/server/db';
import { match, matchGame, mappoolSlot, user } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { MATCH_STATES, type MatchConfig } from './types';
import { getMatchFull, submitRoll, pickMap, submitGameScores } from './engine';
import {
	TournamentLobby,
	setLobby,
	getLobby,
	removeLobby,
	getActiveLobbyCount
} from '../bancho/client';

function sleep(ms: number) {
	return new Promise<void>((r) => setTimeout(r, ms));
}

/** Max concurrent lobbies for non-bot accounts */
const MAX_LOBBIES = 4;

/**
 * Create IRC lobby → configure → invite players → wire up chat handlers → move to ROLLING.
 */
export async function initMatchLobby(matchId: string) {
	const m = await getMatchFull(matchId);
	const config = m.config as MatchConfig;

	// Check lobby limit
	const activeCount = getActiveLobbyCount();
	if (activeCount >= MAX_LOBBIES) {
		console.error(
			`[Orchestrator] Cannot create lobby: ${activeCount}/${MAX_LOBBIES} lobbies active. ` +
			`Close some matches first.`
		);
		throw new Error(
			`Lobby limit reached (${activeCount}/${MAX_LOBBIES}). Close or finish existing matches first.`
		);
	}

	const lobby = new TournamentLobby();

	const lobbyName = `VASH: (${m.participants[0]?.team.name}) vs (${m.participants[1]?.team.name})`;
	console.log(`[Orchestrator] Creating lobby: ${lobbyName}`);

	const { matchId: osuId, channel } = await lobby.create(lobbyName);
	console.log(`[Orchestrator] Created ${channel} (osu mp/${osuId})`);

	setLobby(matchId, lobby);

	// CREATED → LOBBY
	await db
		.update(match)
		.set({ state: MATCH_STATES.LOBBY, osuLobbyId: osuId, startedAt: new Date() })
		.where(eq(match.id, matchId));

	// Configure: HeadToHead, correct score mode, correct size
	const scoreMode =
		config.scoringType === 'score_v2' ? 3
		: config.scoringType === 'accuracy' ? 1
		: config.scoringType === 'combo' ? 2
		: 0;
	await lobby.setProperties(0, scoreMode, config.teamSize * 2);

	// Remove password so players can join via mp link (and rejoin after disconnect)
	await lobby.send('!mp password');
	await sleep(500);

	// Invite all players from both teams (with dedup + delays)
	const invited = new Set<string>();
	for (const p of m.participants) {
		for (const pl of p.players) {
			const u = await db.query.user.findFirst({ where: eq(user.id, pl.userId) });
			if (u?.name && !invited.has(u.name.toLowerCase())) {
				await lobby.invite(u.name);
				invited.add(u.name.toLowerCase());
				console.log(`[Orchestrator] Invited ${u.name}`);
				await sleep(300);
			}
		}
	}

	// Wire up IRC chat handlers for rolls and picks
	setupChatHandlers(matchId, lobby);

	// ── Send welcome AFTER invites with a delay so players have time to join ──
	await sleep(5000);
	await lobby.chat(
		`Welcome! BO${config.bestOf}. Type !roll to decide pick order, or use the web UI.`
	);

	// LOBBY → ROLLING
	await db.update(match).set({ state: MATCH_STATES.ROLLING }).where(eq(match.id, matchId));

	return { osuMatchId: osuId, channel };
}

/**
 * Wire up IRC event callbacks so players can !roll and !pick from osu! chat.
 */
function setupChatHandlers(matchId: string, lobby: TournamentLobby) {
	// ── Handle !roll from IRC ───────────────────────────────────────────
	lobby.onRollResult = async (username: string, value: number) => {
		try {
			const m = await getMatchFull(matchId);
			if (m.state !== MATCH_STATES.ROLLING) {
				await lobby.chat(`Rolls are not active right now.`);
				return;
			}

			let targetParticipant: { id: string; rollValue: number | null } | null = null;

			for (const p of m.participants) {
				for (const pl of p.players) {
					const u = await db.query.user.findFirst({ where: eq(user.id, pl.userId) });
					if (u?.name?.toLowerCase() === username.toLowerCase().replace(/_/g, ' ')) {
						if (p.rollValue === null) {
							targetParticipant = p;
							break;
						} else if (!targetParticipant) {
							const unrolled = m.participants.find((pp) => pp.rollValue === null);
							if (unrolled) targetParticipant = unrolled;
						}
					}
				}
				if (targetParticipant?.rollValue === null) break;
			}

			if (!targetParticipant || targetParticipant.rollValue !== null) {
				await lobby.chat(`${username}: already rolled or not in this match.`);
				return;
			}

			await submitRoll(matchId, targetParticipant.id, value);
			console.log(`[Orchestrator] IRC roll: ${username} = ${value}`);

			const updated = await getMatchFull(matchId);
			if (updated.state === MATCH_STATES.PICKING) {
				const sorted = [...updated.participants].sort(
					(a, b) => (a.pickOrder ?? 99) - (b.pickOrder ?? 99)
				);
				await lobby.chat(
					`Rolls complete! ${sorted[0]?.team.name} picks first. Use !pick <slot> (e.g. !pick NM1) or pick in web UI.`
				);
			}
		} catch (err: any) {
			console.error('[Orchestrator] IRC roll error:', err.message);
		}
	};

	// ── Handle !pick from IRC ───────────────────────────────────────────
	lobby.onPickCommand = async (username: string, slotLabel: string) => {
		try {
			const m = await getMatchFull(matchId);
			if (m.state !== MATCH_STATES.PICKING) {
				await lobby.chat(`Picks are not active right now.`);
				return;
			}

			const labelMatch = slotLabel.match(/^([A-Z]{2})(\d+)$/);
			if (!labelMatch) {
				await lobby.chat(`${username}: Invalid slot. Use format like NM1, HD2, DT1.`);
				return;
			}
			const category = labelMatch[1];
			const order = parseInt(labelMatch[2]);

			const sorted = [...m.participants].sort(
				(a, b) => (a.pickOrder ?? 99) - (b.pickOrder ?? 99)
			);
			const expectedIdx = m.games.length % sorted.length;
			const expectedPicker = sorted[expectedIdx];

			let isPickerTurn = false;
			if (expectedPicker) {
				for (const pl of expectedPicker.players) {
					const u = await db.query.user.findFirst({ where: eq(user.id, pl.userId) });
					if (u?.name?.toLowerCase() === username.toLowerCase().replace(/_/g, ' ')) {
						isPickerTurn = true;
						break;
					}
				}
			}

			// For same-team testing, allow any participant
			if (!isPickerTurn && m.participants[0]?.teamId === m.participants[1]?.teamId) {
				isPickerTurn = true;
			}

			if (!isPickerTurn) {
				await lobby.chat(`${username}: It's not your turn to pick.`);
				return;
			}

			const slot = m.mappool?.slots?.find(
				(s) => s.category === category && s.orderInCategory === order
			);
			if (!slot) {
				await lobby.chat(`${username}: Slot ${slotLabel} not found in this mappool.`);
				return;
			}

			const alreadyPlayed = m.games.some((g) => g.mappoolSlotId === slot.id);
			if (alreadyPlayed) {
				await lobby.chat(`${username}: ${slotLabel} has already been played.`);
				return;
			}

			// ── Tiebreaker restriction ──
			if (slot.category === 'TB') {
				const config = m.config as MatchConfig;
				const winsNeeded = Math.ceil(config.bestOf / 2);
				const allAtMatchPoint = m.participants.every((p) => p.score === winsNeeded - 1);
				if (!allAtMatchPoint) {
					await lobby.chat(`${username}: Tiebreaker can only be picked at match point!`);
					return;
				}
			}

			const game = await pickMap(matchId, expectedPicker!.id, slot.id);
			console.log(`[Orchestrator] IRC pick: ${username} picked ${slotLabel}`);

			playPickedMap(matchId, game.id).catch((err) =>
				console.error('[Orchestrator] IRC play failed:', err.message)
			);
		} catch (err: any) {
			console.error('[Orchestrator] IRC pick error:', err.message);
			await lobby.chat(`Error: ${err.message}`).catch(() => {});
		}
	};
}

/**
 * Called after a map is picked (from web UI or IRC).
 * Sets map + mods in IRC, waits for ready, starts game, collects scores.
 */
export async function playPickedMap(matchId: string, matchGameId: string) {
	const lobby = getLobby(matchId);
	if (!lobby) {
		console.warn('[Orchestrator] No IRC lobby for', matchId, '— skipping IRC');
		return;
	}

	if (!lobby.isAlive) {
		console.warn('[Orchestrator] Lobby for', matchId, 'is dead — removing');
		removeLobby(matchId);
		return;
	}

	const game = await db.query.matchGame.findFirst({
		where: eq(matchGame.id, matchGameId),
		with: { slot: true }
	});
	if (!game) throw new Error('Game not found');

	const slot = game.slot;

	await lobby.setMap(slot.beatmapId);
	await sleep(1000);

	await lobby.setMods(slot.mods);
	await sleep(500);

	await lobby.chat(
		`Playing ${slot.category}${slot.orderInCategory}. Ready up! (Game starts when all players are ready)`
	);

	try {
		await lobby.waitForReady();
		await lobby.chat('All ready — starting in 5s!');
		await lobby.startGame(5);
	} catch (err: any) {
		console.warn('[Orchestrator] Ready timeout:', err.message);
		try {
			await lobby.chat('Ready timed out. Use the web UI to force start, or ready up!');
		} catch { /* lobby may be dead */ }
		return;
	}

	collectScores(matchId, matchGameId, lobby).catch((err) =>
		console.error('[Orchestrator] Score collection failed:', err)
	);
}

/**
 * Force start the current game without waiting for ready.
 */
export async function forceStartGame(matchId: string) {
	const lobby = getLobby(matchId);
	if (!lobby || !lobby.isAlive) return;

	await lobby.chat('Force starting in 10s!');
	await lobby.startGame(10);
}

/**
 * Background task: waits for IRC scores, writes them to DB, advances match state.
 */
async function collectScores(matchId: string, matchGameId: string, lobby: TournamentLobby) {
	const ircScores = await lobby.waitForScores();
	console.log(`[Orchestrator] Scores for game ${matchGameId}:`, ircScores);

	const m = await getMatchFull(matchId);
	const scores: { playerId: string; score: number; passed: boolean }[] = [];

	for (const irc of ircScores) {
		for (const participant of m.participants) {
			for (const player of participant.players) {
				const u = await db.query.user.findFirst({ where: eq(user.id, player.userId) });
				const ircName = irc.username.toLowerCase().replace(/_/g, ' ');
				const dbName = u?.name?.toLowerCase();
				if (dbName && (dbName === ircName || dbName === irc.username.toLowerCase())) {
					scores.push({ playerId: player.id, score: irc.score, passed: irc.passed });
				}
			}
		}
	}

	if (scores.length === 0) {
		console.warn('[Orchestrator] No scores matched any IRC usernames');
		return;
	}

	await submitGameScores(matchGameId, scores);

	const updated = await getMatchFull(matchId);
	if (updated.state === MATCH_STATES.FINISHED) {
		const winner = updated.participants.find((p) => p.teamId === updated.winnerId);
		try {
			await lobby.chat(`GG! ${winner?.team.name ?? '?'} wins the match!`);
			await sleep(5000);
			await lobby.close();
		} catch { /* lobby may already be closed */ }
		removeLobby(matchId);
	} else {
		const sorted = [...updated.participants].sort(
			(a, b) => (a.pickOrder ?? 99) - (b.pickOrder ?? 99)
		);
		const nextIdx = updated.games.length % sorted.length;
		const nextPicker = sorted[nextIdx];
		try {
			await lobby.chat(
				`${nextPicker?.team.name}'s turn to pick. Use !pick <slot> (e.g. !pick HD1) or pick in web UI.`
			);
		} catch { /* lobby may be dead */ }
	}
}

/**
 * Close the IRC lobby for a match.
 */
export async function closeLobby(matchId: string) {
	const lobby = getLobby(matchId);
	if (lobby) {
		await lobby.close();
		removeLobby(matchId);
	}
}
