import { db } from '$lib/server/db';
import { match, matchGame, mappoolSlot, user } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { MATCH_STATES, type MatchConfig } from './types';
import { getMatchFull, submitRoll, pickMap, submitGameScores } from './engine';
import { TournamentLobby, setLobby, getLobby, removeLobby } from '../bancho/client';

function sleep(ms: number) {
	return new Promise<void>((r) => setTimeout(r, ms));
}

/**
 * Create IRC lobby → configure → invite players → wire up chat handlers → move to ROLLING.
 */
export async function initMatchLobby(matchId: string) {
	const m = await getMatchFull(matchId);
	const config = m.config as MatchConfig;
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

			// Find participant linked to this username
			let targetParticipant: { id: string; rollValue: number | null } | null = null;

			for (const p of m.participants) {
				for (const pl of p.players) {
					const u = await db.query.user.findFirst({ where: eq(user.id, pl.userId) });
					if (u?.name?.toLowerCase() === username.toLowerCase().replace(/_/g, ' ')) {
						// If this participant already rolled, try finding another one (same-team testing)
						if (p.rollValue === null) {
							targetParticipant = p;
							break;
						} else if (!targetParticipant) {
							// Keep looking for an unrolled one
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

			// Parse slot label: "NM1" → category=NM, orderInCategory=1
			const labelMatch = slotLabel.match(/^([A-Z]{2})(\d+)$/);
			if (!labelMatch) {
				await lobby.chat(`${username}: Invalid slot. Use format like NM1, HD2, DT1.`);
				return;
			}
			const category = labelMatch[1];
			const order = parseInt(labelMatch[2]);

			// Find the expected picker
			const sorted = [...m.participants].sort(
				(a, b) => (a.pickOrder ?? 99) - (b.pickOrder ?? 99)
			);
			const expectedIdx = m.games.length % sorted.length;
			const expectedPicker = sorted[expectedIdx];

			// Verify it's this player's turn to pick
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

			// Find the mappool slot
			const slot = m.mappool?.slots?.find(
				(s) => s.category === category && s.orderInCategory === order
			);
			if (!slot) {
				await lobby.chat(`${username}: Slot ${slotLabel} not found in this mappool.`);
				return;
			}

			// Check if already played
			const alreadyPlayed = m.games.some((g) => g.mappoolSlotId === slot.id);
			if (alreadyPlayed) {
				await lobby.chat(`${username}: ${slotLabel} has already been played.`);
				return;
			}

			// Execute the pick
			const game = await pickMap(matchId, expectedPicker!.id, slot.id);
			console.log(`[Orchestrator] IRC pick: ${username} picked ${slotLabel}`);

			// Set map in lobby and wait for ready
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

	const game = await db.query.matchGame.findFirst({
		where: eq(matchGame.id, matchGameId),
		with: { slot: true }
	});
	if (!game) throw new Error('Game not found');

	const slot = game.slot;

	// Set beatmap
	await lobby.setMap(slot.beatmapId);
	await sleep(1000);

	// Set mods (always NF + slot mods)
	await lobby.setMods(slot.mods);
	await sleep(500);

	await lobby.chat(
		`Playing ${slot.category}${slot.orderInCategory}. Ready up! (Game starts when all players are ready)`
	);

	// Wait for all players to ready up in osu!, then start
	try {
		await lobby.waitForReady();
		await lobby.chat('All ready — starting in 5s!');
		await lobby.startGame(5);
	} catch (err: any) {
		// If ready times out, inform and don't start
		console.warn('[Orchestrator] Ready timeout:', err.message);
		await lobby.chat('Ready timed out. Use the web UI to force start, or ready up!');
		return;
	}

	// Non-blocking: wait for scores then process
	collectScores(matchId, matchGameId, lobby).catch((err) =>
		console.error('[Orchestrator] Score collection failed:', err)
	);
}

/**
 * Force start the current game without waiting for ready.
 * Called from the web UI "Force Start" button.
 */
export async function forceStartGame(matchId: string) {
	const lobby = getLobby(matchId);
	if (!lobby) return;

	await lobby.chat('Force starting in 10s!');
	await lobby.startGame(10);
}

/**
 * Background task: waits for IRC scores, writes them to DB, advances match state.
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
				// IRC uses underscores for spaces in usernames
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

	// Check if match finished or needs next pick
	const updated = await getMatchFull(matchId);
	if (updated.state === MATCH_STATES.FINISHED) {
		const winner = updated.participants.find((p) => p.teamId === updated.winnerId);
		await lobby.chat(`GG! ${winner?.team.name ?? '?'} wins the match!`);
		await sleep(5000);
		await lobby.close();
		removeLobby(matchId);
	} else {
		// Announce next picker
		const sorted = [...updated.participants].sort(
			(a, b) => (a.pickOrder ?? 99) - (b.pickOrder ?? 99)
		);
		const nextIdx = updated.games.length % sorted.length;
		const nextPicker = sorted[nextIdx];
		await lobby.chat(
			`${nextPicker?.team.name}'s turn to pick. Use !pick <slot> (e.g. !pick HD1) or pick in web UI.`
		);
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
