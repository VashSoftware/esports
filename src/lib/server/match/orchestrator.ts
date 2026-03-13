import { db } from '$lib/server/db';
import { match, matchGame, matchParticipant, user } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { MATCH_STATES, GAME_STATES, type MatchConfig } from './types';
import { submitRoll, pickMap, submitGameScores, cancelMatch } from './engine';
import { getMatchFull } from './helpers';
import { env } from '$env/dynamic/private';

// matchId → lowercase usernames of all expected players
const expectedPlayers = new Map<string, Set<string>>();
// matchId → lowercase usernames who have joined the IRC lobby so far
const joinedPlayers = new Map<string, Set<string>>();
import {
	TournamentLobby,
	setLobby,
	getLobby,
	removeLobby,
	getActiveLobbyCount
} from '../bancho/client';
import { getOsuMatch } from '../osu/api';
import { account } from '../db/auth.schema';

function sleep(ms: number) {
	return new Promise<void>((r) => setTimeout(r, ms));
}

// ── Match Timeouts ──────────────────────────────────────────────────────
// Hard caps so the platform doesn't wait forever for players.
// Lobby join → cancel.  Rolling → auto-roll.  Picking → auto-pick.  Ready → force start.

const TIMEOUT_LOBBY_JOIN = 5 * 60 * 1000; //  5 min to join
const TIMEOUT_ROLLING = 5 * 60 * 1000; //  5 min to complete all rolls
const TIMEOUT_PICKING = 2 * 60 * 1000; //  2 min to pick a map
const TIMEOUT_READY = 2 * 60 * 1000; //  2 min to ready up after map is set

const matchTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

function setMatchTimeout(matchId: string, phase: string, ms: number, fn: () => void) {
	const key = `${matchId}:${phase}`;
	clearMatchTimeout(matchId, phase);
	matchTimeouts.set(key, setTimeout(fn, ms));
	const secs = Math.round(ms / 1000);
	console.log(`[Timeout] Set ${phase} timeout for match ${matchId} (${secs}s)`);
}

function clearMatchTimeout(matchId: string, phase: string) {
	const key = `${matchId}:${phase}`;
	const t = matchTimeouts.get(key);
	if (t) {
		clearTimeout(t);
		matchTimeouts.delete(key);
		console.log(`[Timeout] Cleared ${phase} timeout for match ${matchId}`);
	}
}

function clearAllMatchTimeouts(matchId: string) {
	for (const [key, t] of matchTimeouts.entries()) {
		if (key.startsWith(`${matchId}:`)) {
			clearTimeout(t);
			matchTimeouts.delete(key);
		}
	}
}

/**
 * Cancel a match due to timeout.  Notifies in IRC, closes the lobby, and
 * marks the match CANCELLED in the database.
 */
async function timeoutMatch(matchId: string, reason: string) {
	console.warn(`[Orchestrator] Match ${matchId} timed out: ${reason}`);
	clearAllMatchTimeouts(matchId);

	const lobby = getLobby(matchId);
	if (lobby?.isAlive) {
		try {
			await lobby.chat(`⏰ Match cancelled — ${reason}`);
			await sleep(3000);
			await lobby.close();
		} catch {
			/* lobby may already be dead */
		}
	}

	removeLobby(matchId);
	expectedPlayers.delete(matchId);
	joinedPlayers.delete(matchId);

	try {
		await cancelMatch(matchId);
	} catch (err: any) {
		console.error(`[Orchestrator] Failed to cancel timed-out match ${matchId}:`, err.message);
	}
}

/**
 * Central timeout manager.  Call after every state transition so the
 * correct phase-timeout is armed.  Safe to call from both IRC handlers
 * and web form actions.
 */
export function onMatchStateChange(matchId: string, newState: string) {
	// Always wipe previous phase timers first
	clearAllMatchTimeouts(matchId);

	switch (newState) {
		case MATCH_STATES.LOBBY:
			setMatchTimeout(matchId, 'lobby', TIMEOUT_LOBBY_JOIN, async () => {
				const joined = joinedPlayers.get(matchId) ?? new Set();
				const expected = expectedPlayers.get(matchId) ?? new Set();
				const missing = [...expected].filter((p) => !joined.has(p));
				const detail = missing.length > 0 ? `Missing: ${missing.join(', ')}.` : '';
				await timeoutMatch(matchId, `Not all players joined within 5 minutes. ${detail}`);
			});
			break;

		case MATCH_STATES.ROLLING:
			setMatchTimeout(matchId, 'rolling', TIMEOUT_ROLLING, async () => {
				try {
					const m = await getMatchFull(matchId);
					if (m.state !== MATCH_STATES.ROLLING) return;

					const lobby = getLobby(matchId);
					const initialUnrolled = m.participants.filter((p) => p.rollValue === null);
					if (initialUnrolled.length === 0) return;

					const names = initialUnrolled.map((p) => p.team.name).join(', ');
					if (lobby?.isAlive) {
						await lobby.chat(`⏰ Rolling timed out — auto-rolling for: ${names}`);
					}

					// Auto-roll with tie retry: keep rolling until no ties
					let tieTries = 0;
					let current = await getMatchFull(matchId);
					while (current.state === MATCH_STATES.ROLLING && tieTries < 10) {
						const unrolled = current.participants.filter((p) => p.rollValue === null);
						if (unrolled.length === 0) break;
						for (const p of unrolled) {
							const autoRoll = Math.floor(Math.random() * 100) + 1;
							await submitRoll(matchId, p.id, autoRoll);
							console.log(
								`[Timeout] Auto-rolled ${autoRoll} for ${p.team.name} in match ${matchId}`
							);
							if (lobby?.isAlive) {
								await lobby.chat(`${p.team.name} auto-rolled ${autoRoll}`);
							}
						}
						current = await getMatchFull(matchId);
						if (current.state === MATCH_STATES.ROLLING) {
							// Tie — all rolls were reset, retry
							tieTries++;
							if (lobby?.isAlive) {
								await lobby.chat(`Tie! Auto-rolling again...`);
							}
						}
					}

					// After auto-rolling, check if state advanced to PICKING
					if (current.state === MATCH_STATES.PICKING) {
						onMatchStateChange(matchId, MATCH_STATES.PICKING);
						const sorted = [...current.participants].sort(
							(a, b) => (a.pickOrder ?? 99) - (b.pickOrder ?? 99)
						);

						// Check if this was a tiebreaker re-roll
						const autoRollConfig = m.config as MatchConfig;
						const autoRollWins = Math.ceil(autoRollConfig.bestOf / 2);
						const isTBAutoRoll = current.participants.every((p) => p.score === autoRollWins - 1);

						if (lobby?.isAlive) {
							if (isTBAutoRoll) {
								await lobby.chat(
									`Rolls complete! ${sorted[0]?.team.name} picks the tiebreaker. ` +
										`Use !pick TB<n> (e.g. !pick TB1). You have 2 minutes.`
								);
							} else {
								await lobby.chat(
									`Rolls complete! ${sorted[0]?.team.name} picks first. ` +
										`Use !pick <slot> (e.g. !pick NM1). You have 2 minutes.`
								);
							}
						}
					}
				} catch (err: any) {
					console.error(`[Timeout] Auto-roll failed for match ${matchId}:`, err.message);
					await timeoutMatch(matchId, 'Auto-roll failed — match cancelled.');
				}
			});
			break;

		case MATCH_STATES.PICKING:
			setMatchTimeout(matchId, 'picking', TIMEOUT_PICKING, async () => {
				try {
					const m = await getMatchFull(matchId);
					if (m.state !== MATCH_STATES.PICKING) return;

					const lobby = getLobby(matchId);
					const config = m.config as MatchConfig;

					// Determine whose turn it is
					const sorted = [...m.participants].sort(
						(a, b) => (a.pickOrder ?? 99) - (b.pickOrder ?? 99)
					);
					const expectedIdx = m.games.length % sorted.length;
					const picker = sorted[expectedIdx];

					// Find available slots — at match point, only TB maps are pickable
					const playedSlotIds = new Set(m.games.map((g) => g.mappoolSlotId));
					const winsNeeded = Math.ceil(config.bestOf / 2);
					const allAtMatchPoint = m.participants.every((p) => p.score === winsNeeded - 1);

					const available = (m.mappool?.slots ?? []).filter((s) => {
						if (playedSlotIds.has(s.id)) return false;
						if (allAtMatchPoint) return s.category === 'TB';
						return s.category !== 'TB';
					});

					if (available.length === 0) {
						await timeoutMatch(matchId, 'No available maps to auto-pick.');
						return;
					}

					const randomSlot = available[Math.floor(Math.random() * available.length)];
					const slotLabel = `${randomSlot.category}${randomSlot.orderInCategory}`;

					if (lobby?.isAlive) {
						await lobby.chat(
							`⏰ Pick timed out — auto-picking ${slotLabel} for ${picker?.team.name}`
						);
					}
					console.log(`[Timeout] Auto-picked ${slotLabel} for match ${matchId}`);

					const game = await pickMap(matchId, picker!.id, randomSlot.id);
					playPickedMap(matchId, game.id).catch((err) =>
						console.error('[Timeout] Auto-pick play failed:', err.message)
					);
				} catch (err: any) {
					console.error(`[Timeout] Auto-pick failed for match ${matchId}:`, err.message);
					await timeoutMatch(matchId, 'Auto-pick failed — match cancelled.');
				}
			});
			break;

		// PLAYING ready-timeout is set by playPickedMap (needs gameInProgress guard)
		case MATCH_STATES.FINISHED:
		case MATCH_STATES.CANCELLED:
			// Already cleared above — nothing else to arm
			break;
	}
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
		config.scoringType === 'score_v2'
			? 3
			: config.scoringType === 'accuracy'
				? 1
				: config.scoringType === 'combo'
					? 2
					: 0;
	await lobby.setProperties(0, scoreMode, config.teamSize * 2);
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

	// Store expected players for the rolling gate (reuse the invited set)
	expectedPlayers.set(matchId, new Set(invited));
	joinedPlayers.set(matchId, new Set<string>());

	// Wire up IRC chat handlers for rolls, picks, and player joins
	setupChatHandlers(matchId, lobby);

	// ── Arm the lobby-join timeout (5 min) ──
	onMatchStateChange(matchId, MATCH_STATES.LOBBY);

	// State stays LOBBY — transitions to ROLLING only when all players have joined
	return { osuMatchId: osuId, channel };
}

/**
 * Wire up IRC event callbacks for the full match lifecycle.
 *
 * Design principle: players may join late and have NO chat history.
 * Every phase transition message should give enough context to know what to do.
 * We also greet each player individually when they join, telling them the current state.
 */
function setupChatHandlers(matchId: string, lobby: TournamentLobby) {
	// ── Welcome players when they JOIN the channel ──────────────────────
	lobby.onPlayerJoined = async (username: string) => {
		try {
			const normalizedName = username.toLowerCase().replace(/_/g, ' ');

			// Track who has joined for the rolling gate
			const joined = joinedPlayers.get(matchId) ?? new Set<string>();
			joined.add(normalizedName);
			joinedPlayers.set(matchId, joined);

			const m = await getMatchFull(matchId);
			const config = m.config as MatchConfig;

			if (m.state === MATCH_STATES.LOBBY) {
				const expected = expectedPlayers.get(matchId) ?? new Set<string>();
				const allJoined = expected.size > 0 && [...expected].every((p) => joined.has(p));

				if (allJoined) {
					await db.update(match).set({ state: MATCH_STATES.ROLLING }).where(eq(match.id, matchId));
					// ── Arm rolling timeout (clears lobby timeout) ──
					onMatchStateChange(matchId, MATCH_STATES.ROLLING);
					await sleep(500);
					await lobby.chat(
						`All players present! BO${config.bestOf} match — type !roll to decide pick order. You have 5 minutes.`
					);
				} else {
					const missing = [...expected].filter((p) => !joined.has(p));
					await sleep(1000);
					await lobby.chat(
						`Welcome ${username}! Waiting for ${missing.length} more player(s) to join before we start.`
					);
				}
			} else if (m.state === MATCH_STATES.ROLLING) {
				const unrolled = m.participants.filter((p) => p.rollValue === null);
				if (unrolled.length > 0) {
					await sleep(1000);
					await lobby.chat(
						`Welcome ${username}! BO${config.bestOf} match — type !roll to decide pick order.`
					);
				} else {
					await lobby.chat(`Welcome ${username}! Waiting for rolls to finish...`);
				}
			} else if (m.state === MATCH_STATES.PICKING) {
				const sorted = [...m.participants].sort(
					(a, b) => (a.pickOrder ?? 99) - (b.pickOrder ?? 99)
				);
				const nextIdx = m.games.length % sorted.length;
				const picker = sorted[nextIdx];
				const scoreStr = `(${sorted[0]?.team.name}) ${sorted[0]?.score} - ${sorted[1]?.score} (${sorted[1]?.team.name})`;
				await sleep(1000);
				await lobby.chat(
					`Welcome back ${username}! ${scoreStr} — ${picker?.team.name}'s turn to pick. Use !pick <slot> (e.g. !pick NM1).`
				);
			} else if (m.state === MATCH_STATES.PLAYING) {
				// ── FIX: check lobby.gameInProgress to give the right message ──
				await sleep(1000);
				if (lobby.gameInProgress) {
					await lobby.chat(
						`Welcome back ${username}! A game is in progress — ready up when it finishes.`
					);
				} else {
					await lobby.chat(`Welcome back ${username}! Please ready up so the game can start.`);
				}
			}
		} catch (err: any) {
			console.error('[Orchestrator] Player join handler error:', err.message);
		}
	};

	// ── Handle !roll from IRC ───────────────────────────────────────────
	lobby.onRollResult = async (username: string, value: number) => {
		try {
			const m = await getMatchFull(matchId);
			if (m.state !== MATCH_STATES.ROLLING) {
				await lobby.chat(`Rolls are not active right now.`);
				return;
			}

			let targetParticipant: { id: string; rollValue: number | null; team: any } | null = null;

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

			const isLastRoll = m.participants.filter((p) => p.rollValue === null).length === 1;

			await submitRoll(matchId, targetParticipant.id, value);
			console.log(`[Orchestrator] IRC roll: ${username} = ${value}`);

			// Check if all rolled → announce pick order or tie
			const updated = await getMatchFull(matchId);
			const remaining = updated.participants.filter((p) => p.rollValue === null);

			if (updated.state === MATCH_STATES.PICKING) {
				// ── Arm picking timeout (clears rolling timeout) ──
				onMatchStateChange(matchId, MATCH_STATES.PICKING);
				const sorted = [...updated.participants].sort(
					(a, b) => (a.pickOrder ?? 99) - (b.pickOrder ?? 99)
				);
				await sleep(500);

				// Check if this is a tiebreaker re-roll
				const rollConfig = updated.config as MatchConfig;
				const rollWinsNeeded = Math.ceil(rollConfig.bestOf / 2);
				const isTBRoll = updated.participants.every((p) => p.score === rollWinsNeeded - 1);

				if (isTBRoll) {
					await lobby.chat(
						`Rolls complete! ${sorted[0]?.team.name} picks the tiebreaker. ` +
							`Use !pick TB<n> (e.g. !pick TB1). You have 2 minutes.`
					);
				} else {
					await lobby.chat(
						`Rolls complete! ${sorted[0]?.team.name} picks first. ` +
							`Use !pick <slot> (e.g. !pick NM1). You have 2 minutes.`
					);
				}
			} else if (isLastRoll && remaining.length === updated.participants.length) {
				// All rolled the same value — everyone must reroll
				await lobby.chat(`Tie! All players rolled ${value}. Please !roll again.`);
			} else if (remaining.length > 0) {
				// Tell the other player they still need to roll
				await lobby.chat(
					`${targetParticipant.team?.name ?? username} rolled ${value}. ` +
						`Waiting for ${remaining.map((p) => p.team.name).join(', ')} to !roll.`
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

			const sorted = [...m.participants].sort((a, b) => (a.pickOrder ?? 99) - (b.pickOrder ?? 99));
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
				await lobby.chat(`${username}: It's ${expectedPicker?.team.name}'s turn to pick.`);
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

			// ── Tiebreaker restrictions ──
			const config = m.config as MatchConfig;
			const winsNeeded = Math.ceil(config.bestOf / 2);
			const allAtMatchPoint = m.participants.every((p) => p.score === winsNeeded - 1);

			if (slot.category === 'TB' && !allAtMatchPoint) {
				await lobby.chat(`${username}: Tiebreaker can only be picked at match point!`);
				return;
			}
			if (allAtMatchPoint && slot.category !== 'TB') {
				await lobby.chat(`${username}: Only tiebreaker maps can be picked at match point!`);
				return;
			}

			const game = await pickMap(matchId, expectedPicker!.id, slot.id);
			console.log(`[Orchestrator] IRC pick: ${username} picked ${slotLabel}`);

			// Picking timeout is cleared inside playPickedMap
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
	// ── Clear picking timeout (a pick was made) ──
	clearMatchTimeout(matchId, 'picking');

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
	const m = await getMatchFull(matchId);
	const score = m.participants.map((p) => `${p.team.name} ${p.score}`).join(' - ');

	// Set beatmap
	await lobby.setMap(slot.beatmapId);
	await sleep(1000);

	// Set mods — FM category always uses Freemod regardless of stored mods array
	await lobby.setMods(slot.category === 'FM' ? ['FM'] : slot.mods);
	await sleep(500);

	// Announce with context: what map, current score, what to do
	await lobby.chat(
		`[${score}] Now playing ${slot.category}${slot.orderInCategory}. Please ready up! You have 2 minutes.`
	);

	// ── Arm ready timeout: force start if nobody readies within 2 min ──
	// Guard: if the game actually starts (force start / normal start)
	// the timeout checks gameInProgress before force-starting.
	setMatchTimeout(matchId, 'ready', TIMEOUT_READY, async () => {
		const currentLobby = getLobby(matchId);
		if (currentLobby?.gameInProgress) {
			// Game is running — scores will come in eventually
			console.log(`[Timeout] Ready timeout fired but game is in progress for ${matchId}, ignoring`);
			return;
		}
		console.log(`[Timeout] Ready timed out for match ${matchId} — force starting`);
		if (currentLobby?.isAlive) {
			try {
				await currentLobby.chat('⏰ Ready timed out — force starting in 10s!');
				await currentLobby.startGame(10);
			} catch (err: any) {
				console.error(`[Timeout] Force start failed for match ${matchId}:`, err.message);
			}
		}
	});

	// Wait for all players to ready up in osu!, then start
	// Use a shorter soft-timeout so we can warn before the hard force-start fires
	try {
		await lobby.waitForReady(TIMEOUT_READY - 15_000);
		clearMatchTimeout(matchId, 'ready'); // players readied — disarm
		await lobby.chat('All ready — starting in 5s!');
		await lobby.startGame(5);
	} catch (err: any) {
		console.warn('[Orchestrator] Ready timeout:', err.message);
		try {
			await lobby.chat('Timed out waiting for ready. Game will force start soon!');
		} catch {
			/* lobby may be dead */
		}
		// Still set up score collection — force start will trigger the game
		collectScores(matchId, matchGameId, lobby).catch((err) =>
			console.error('[Orchestrator] Score collection failed:', err)
		);
		return;
	}

	// Non-blocking: wait for scores then process
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

	// Game is being force-started → disarm the ready timeout
	clearMatchTimeout(matchId, 'ready');

	await lobby.chat('Force starting in 10s!');
	await lobby.startGame(10);
}

/**
 * Background task: waits for IRC scores, writes them to DB, advances match state.
 * Announces results clearly in chat.
 */
async function collectScores(matchId: string, matchGameId: string, lobby: TournamentLobby) {
	const ircScores = await lobby.waitForScores();

	// Game finished → disarm the ready timeout if it's still ticking
	clearMatchTimeout(matchId, 'ready');

	console.log(`[Orchestrator] Scores for game ${matchGameId}:`, ircScores);

	// Map IRC usernames → matchParticipantPlayer IDs
	const m = await getMatchFull(matchId);
	const scores: {
		playerId: string;
		score: number;
		passed: boolean;
		accuracy?: number;
		maxCombo?: number;
		count300?: number;
		count100?: number;
		count50?: number;
		countMiss?: number;
		mods?: string[];
		pp?: number | null;
	}[] = [];

	// ── FIX: Build matchParticipantPlayer.id → osu numeric account ID map ──
	const playerOsuIdMap = new Map<string, number>();
	const playerUserIdMap = new Map<string, string>();

	for (const irc of ircScores) {
		for (const participant of m.participants) {
			for (const player of participant.players) {
				const u = await db.query.user.findFirst({ where: eq(user.id, player.userId) });
				const ircName = irc.username.toLowerCase().replace(/_/g, ' ');
				const dbName = u?.name?.toLowerCase();
				if (dbName && (dbName === ircName || dbName === irc.username.toLowerCase())) {
					scores.push({ playerId: player.id, score: irc.score, passed: irc.passed });
					playerUserIdMap.set(player.id, player.userId);

					if (!playerOsuIdMap.has(player.id)) {
						const acc = await db.query.account.findFirst({
							where: and(eq(account.userId, player.userId), eq(account.providerId, 'osu'))
						});
						if (acc?.accountId) {
							playerOsuIdMap.set(player.id, parseInt(acc.accountId));
						}
					}
				}
			}
		}
	}

	if (scores.length === 0) {
		console.warn('[Orchestrator] No scores matched any IRC usernames');
		return;
	}

	// ── Enrich scores with osu! API data ──
	if (m.osuLobbyId) {
		try {
			await sleep(2000);

			const osuMatchData = await getOsuMatch(m.osuLobbyId);
			const gameRecord = await db.query.matchGame.findFirst({
				where: eq(matchGame.id, matchGameId),
				with: { slot: true }
			});
			const beatmapId = gameRecord?.slot?.beatmapId ? parseInt(gameRecord.slot.beatmapId) : null;

			if (beatmapId && osuMatchData?.events) {
				const gameEvents = [...osuMatchData.events]
					.reverse()
					.filter((e: any) => e.game?.beatmap_id === beatmapId);

				const osuGame = gameEvents[0]?.game;
				if (osuGame?.scores) {
					const osuScoreMap = new Map<number, any>();
					for (const os of osuGame.scores) {
						osuScoreMap.set(os.user_id, os);
					}

					console.log(
						`[Orchestrator] osu! API returned ${osuGame.scores.length} scores for beatmap ${beatmapId}. ` +
							`Player map has ${playerOsuIdMap.size} entries.`
					);

					for (const s of scores) {
						const playerOsuId = playerOsuIdMap.get(s.playerId);
						if (playerOsuId === undefined) {
							console.warn(`[Orchestrator] No osu account ID for player ${s.playerId}`);
							continue;
						}
						const osuScore = osuScoreMap.get(playerOsuId);
						if (!osuScore) {
							console.warn(`[Orchestrator] No osu! API score for osu user ${playerOsuId}`);
							continue;
						}

						s.accuracy = osuScore.accuracy ?? undefined;
						s.maxCombo = osuScore.max_combo ?? undefined;
						s.count300 = osuScore.statistics?.count_300 ?? undefined;
						s.count100 = osuScore.statistics?.count_100 ?? undefined;
						s.count50 = osuScore.statistics?.count_50 ?? undefined;
						s.countMiss = osuScore.statistics?.count_miss ?? undefined;
						s.pp = osuScore.pp ?? null;
						if (osuScore.mods?.length) {
							s.mods = osuScore.mods.map((mod: any) =>
								typeof mod === 'string' ? mod : (mod.acronym ?? mod)
							);
						}
					}
					console.log(`[Orchestrator] Enriched scores from osu! API for game ${matchGameId}`);
				} else {
					console.warn(`[Orchestrator] No scores in osu! API game event for beatmap ${beatmapId}`);
				}
			}
		} catch (err: any) {
			console.warn('[Orchestrator] Failed to enrich scores from osu! API:', err.message);
		}
	}

	await submitGameScores(matchGameId, scores);

	// ── Announce results clearly ──
	const updated = await getMatchFull(matchId);
	const config = updated.config as MatchConfig;
	const winsNeeded = Math.ceil(config.bestOf / 2);

	const sortedPs = [...updated.participants].sort(
		(a, b) => (a.pickOrder ?? 99) - (b.pickOrder ?? 99)
	);
	const ps1 = sortedPs[0];
	const ps2 = sortedPs[1];

	const game = updated.games.find((g) => g.id === matchGameId);
	if (game && game.winnerParticipantId) {
		const winner = updated.participants.find((p) => p.id === game.winnerParticipantId);
		const slotLabel = `${game.slot?.category}${game.slot?.orderInCategory}`;

		const teamTotals = new Map<string, number>();
		for (const s of game.scores ?? []) {
			const pid = s.player?.participantId;
			if (pid) teamTotals.set(pid, (teamTotals.get(pid) ?? 0) + s.score);
		}
		const score1 = (teamTotals.get(ps1?.id ?? '') ?? 0).toLocaleString();
		const score2 = (teamTotals.get(ps2?.id ?? '') ?? 0).toLocaleString();

		await sleep(500);
		try {
			await lobby.chat(
				`(${ps1?.team.name}) ${score1} - ${score2} (${ps2?.team.name}) — ${winner?.team.name ?? '?'} wins ${slotLabel}!`
			);
		} catch {
			/* ignore */
		}
	}

	const matchScoreStr = `(${ps1?.team.name}) ${ps1?.score} - ${ps2?.score} (${ps2?.team.name})`;

	if (updated.state === MATCH_STATES.FINISHED) {
		// ── Match over — clear everything ──
		clearAllMatchTimeouts(matchId);

		const winner = updated.participants.find((p) => p.teamId === updated.winnerId);
		try {
			await sleep(1000);
			await lobby.chat(`GG! ${winner?.team.name ?? '?'} wins the match! ${matchScoreStr}`);
			await sleep(2000);
			await lobby.chat(`Results: ${env.ORIGIN}/matches/${matchId}`);
			await lobby.chat(`This lobby will close in 3 minutes.`);
			await sleep(3 * 60 * 1000);
			await lobby.close();
		} catch {
			/* lobby may already be closed */
		}
		removeLobby(matchId);
		expectedPlayers.delete(matchId);
		joinedPlayers.delete(matchId);
	} else {
		// ── Check for tiebreaker situation ──
		const allAtMatchPoint = updated.participants.every((p) => p.score === winsNeeded - 1);

		if (allAtMatchPoint) {
			const playedSlotIds = new Set(updated.games.map((g) => g.mappoolSlotId));
			const tbSlots = (updated.mappool?.slots ?? []).filter(
				(s) => s.category === 'TB' && !playedSlotIds.has(s.id)
			);

			if (tbSlots.length === 1) {
				// Single TB — auto-pick it
				const picker = sortedPs[updated.games.length % sortedPs.length];
				const tbLabel = `TB${tbSlots[0].orderInCategory}`;
				try {
					await sleep(1000);
					await lobby.chat(`🔥 Tiebreaker! ${matchScoreStr} — auto-picking ${tbLabel}!`);
				} catch {
					/* ignore */
				}

				const game = await pickMap(matchId, picker!.id, tbSlots[0].id);
				playPickedMap(matchId, game.id).catch((err) =>
					console.error('[Orchestrator] TB auto-pick play failed:', err.message)
				);
				return;
			} else if (tbSlots.length > 1) {
				// Multiple TBs — re-roll to decide who picks
				for (const p of updated.participants) {
					await db
						.update(matchParticipant)
						.set({ rollValue: null, pickOrder: null })
						.where(eq(matchParticipant.id, p.id));
				}
				await db.update(match).set({ state: MATCH_STATES.ROLLING }).where(eq(match.id, matchId));

				onMatchStateChange(matchId, MATCH_STATES.ROLLING);

				try {
					await sleep(1000);
					await lobby.chat(
						`🔥 Tiebreaker! ${matchScoreStr} — ${tbSlots.length} tiebreaker maps available. ` +
							`Roll to decide who picks! Type !roll. You have 5 minutes.`
					);
				} catch {
					/* ignore */
				}
				return;
			}
			// Zero unplayed TBs at match point — fall through to normal picking
		}

		// ── Back to PICKING — arm the pick timeout ──
		onMatchStateChange(matchId, MATCH_STATES.PICKING);

		const nextIdx = updated.games.length % sortedPs.length;
		const nextPicker = sortedPs[nextIdx];
		try {
			await sleep(1000);
			await lobby.chat(
				`${matchScoreStr} — first to ${winsNeeded} — ${nextPicker?.team.name}'s turn to pick. Use !pick <slot> (2 min to pick)`
			);
		} catch {
			/* lobby may be dead */
		}
	}
}

/**
 * Close the IRC lobby for a match.
 */
export async function closeLobby(matchId: string) {
	clearAllMatchTimeouts(matchId);
	const lobby = getLobby(matchId);
	if (lobby) {
		await lobby.close();
		removeLobby(matchId);
	}
	expectedPlayers.delete(matchId);
	joinedPlayers.delete(matchId);
}
