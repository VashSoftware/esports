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

	// Wire up IRC chat handlers for rolls, picks, and player joins
	setupChatHandlers(matchId, lobby);

	// LOBBY → ROLLING (we'll greet players individually when they join)
	await db.update(match).set({ state: MATCH_STATES.ROLLING }).where(eq(match.id, matchId));

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
	// This is the key fix: osu! doesn't show chat history, so players
	// only see messages sent AFTER they join. We greet each one individually.
	lobby.onPlayerJoined = async (username: string) => {
		try {
			const m = await getMatchFull(matchId);
			const config = m.config as MatchConfig;

			if (m.state === MATCH_STATES.ROLLING) {
				// Tell them what's happening and what they need to do
				const unrolled = m.participants.filter((p) => p.rollValue === null);
				if (unrolled.length > 0) {
					await sleep(1000); // small delay so they see it after join message
					await lobby.chat(
						`Welcome ${username}! This is a BO${config.bestOf} match. ` +
						`Type !roll to decide pick order.`
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
				const score = m.participants.map((p) => `${p.team.name}: ${p.score}`).join(' | ');
				await sleep(1000);
				await lobby.chat(
					`Welcome back ${username}! Score: ${score}. ` +
					`${picker?.team.name}'s turn to pick. Use !pick <slot> (e.g. !pick NM1).`
				);
			} else if (m.state === MATCH_STATES.PLAYING) {
				await sleep(1000);
				await lobby.chat(`Welcome back ${username}! A game is in progress — ready up when it finishes.`);
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

			await submitRoll(matchId, targetParticipant.id, value);
			console.log(`[Orchestrator] IRC roll: ${username} = ${value}`);

			// Check if all rolled → announce pick order
			const updated = await getMatchFull(matchId);
			const remaining = updated.participants.filter((p) => p.rollValue === null);

			if (updated.state === MATCH_STATES.PICKING) {
				const sorted = [...updated.participants].sort(
					(a, b) => (a.pickOrder ?? 99) - (b.pickOrder ?? 99)
				);
				await sleep(500);
				await lobby.chat(
					`Rolls complete! ${sorted[0]?.team.name} picks first. ` +
					`Use !pick <slot> (e.g. !pick NM1).`
				);
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
	const m = await getMatchFull(matchId);
	const config = m.config as MatchConfig;
	const score = m.participants.map((p) => `${p.team.name} ${p.score}`).join(' - ');

	// Set beatmap
	await lobby.setMap(slot.beatmapId);
	await sleep(1000);

	// Set mods
	await lobby.setMods(slot.mods);
	await sleep(500);

	// Announce with context: what map, current score, what to do
	await lobby.chat(
		`[${score}] Now playing ${slot.category}${slot.orderInCategory}. Please ready up!`
	);

	// Wait for all players to ready up in osu!, then start
	try {
		await lobby.waitForReady();
		await lobby.chat('All ready — starting in 5s!');
		await lobby.startGame(5);
	} catch (err: any) {
		console.warn('[Orchestrator] Ready timeout:', err.message);
		try {
			await lobby.chat('Timed out waiting for ready. Ready up and the game will start, or an admin can force start from the web UI.');
		} catch { /* lobby may be dead */ }
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

	await lobby.chat('Force starting in 10s!');
	await lobby.startGame(10);
}

/**
 * Background task: waits for IRC scores, writes them to DB, advances match state.
 * Announces results clearly in chat.
 */
async function collectScores(matchId: string, matchGameId: string, lobby: TournamentLobby) {
	const ircScores = await lobby.waitForScores();
	console.log(`[Orchestrator] Scores for game ${matchGameId}:`, ircScores);

	// Map IRC usernames → matchParticipantPlayer IDs
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

	// ── Announce results clearly ──
	const updated = await getMatchFull(matchId);
	const config = updated.config as MatchConfig;
	const winsNeeded = Math.ceil(config.bestOf / 2);

	// Build score announcement: "Zigzy 808,050 vs Stan 3,418 — Zigzy wins!"
	const game = updated.games.find((g) => g.id === matchGameId);
	if (game && game.winnerParticipantId) {
		const winner = updated.participants.find((p) => p.id === game.winnerParticipantId);

		// Individual player scores
		const scoreLines = ircScores
			.map((s) => `${s.username}: ${s.score.toLocaleString()}`)
			.join(' vs ');

		await sleep(500);
		try {
			await lobby.chat(`${scoreLines} — ${winner?.team.name ?? '?'} wins the point!`);
		} catch { /* ignore */ }
	}

	// Match score line
	const matchScore = updated.participants
		.map((p) => `${p.team.name} ${p.score}`)
		.join(' - ');

	if (updated.state === MATCH_STATES.FINISHED) {
		const winner = updated.participants.find((p) => p.teamId === updated.winnerId);
		try {
			await sleep(1000);
			await lobby.chat(`GG! ${winner?.team.name ?? '?'} wins the match! Final: ${matchScore}`);
			await sleep(5000);
			await lobby.close();
		} catch { /* lobby may already be closed */ }
		removeLobby(matchId);
	} else {
		// Announce next picker with current score
		const sorted = [...updated.participants].sort(
			(a, b) => (a.pickOrder ?? 99) - (b.pickOrder ?? 99)
		);
		const nextIdx = updated.games.length % sorted.length;
		const nextPicker = sorted[nextIdx];
		try {
			await sleep(1000);
			await lobby.chat(
				`Score: ${matchScore} (first to ${winsNeeded}). ` +
				`${nextPicker?.team.name}'s turn to pick. Use !pick <slot>.`
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
