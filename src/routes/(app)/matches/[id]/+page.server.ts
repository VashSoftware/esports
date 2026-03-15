import { log } from '$lib/server/logger';
import { user } from '$lib/server/db/schema';
import { db } from '$lib/server/db';
import { mappoolSlot } from '$lib/server/db/schema';
import { getMatchFull, submitRoll, pickMap, cancelMatch } from '$lib/server/match/engine';
import { playPickedMap, closeLobby, forceStartGame } from '$lib/server/match/orchestrator';
import { getLobby, getLobbyStatus } from '$lib/server/bancho/client';
import { error, redirect } from '@sveltejs/kit';
import { getBeatmap } from '$lib/server/osu/api';
import { proxyImage } from '$lib/server/storage/r2';
import { hasRole } from '$lib/server/permissions';
import type { PageServerLoad, Actions } from './$types';
import { eq } from 'drizzle-orm';
import type { MatchConfig } from '$lib/server/match/types';
import { playerRating } from '$lib/server/db/schema';

export const load: PageServerLoad = async ({ params, locals }) => {
	if (!locals.user) redirect(302, '/');

	let m;
	try {
		m = await getMatchFull(params.id);
	} catch {
		error(404, 'Match not found');
	}

	// Sort game scores by the match win condition so clients always receive sorted data
	const scoringType = (m.config as MatchConfig).scoringType;
	for (const game of m.games) {
		if (game.scores?.length > 1) {
			game.scores.sort((a, b) => {
				if (scoringType === 'accuracy') return b.accuracy - a.accuracy;
				if (scoringType === 'combo') return b.maxCombo - a.maxCombo;
				return b.score - a.score;
			});
		}
	}

	// Build beatmap metadata cache — prefer DB-stored R2 URLs, fall back to API
	const beatmapCache: Record<string, any> = {};
	if (m.mappool?.slots) {
		await Promise.allSettled(
			m.mappool.slots.map(async (slot) => {
				// Fast path: metadata already stored in DB
				if (slot.title !== null) {
					// Sanitize any stale ppy.sh fallback URLs (image was unavailable when first fetched)
					const coverUrl = slot.coverUrl?.includes('ppy.sh') ? null : (slot.coverUrl ?? null);
					const listCoverUrl = slot.listCoverUrl?.includes('ppy.sh')
						? null
						: (slot.listCoverUrl ?? null);
					beatmapCache[slot.beatmapId] = {
						title: slot.title,
						artist: slot.artist ?? '',
						version: slot.version ?? '',
						starRating: slot.starRating ?? 0,
						bpm: slot.bpm ?? 0,
						totalLength: slot.totalLength ?? 0,
						coverUrl,
						listCoverUrl
					};
					return;
				}

				// Slow path: legacy slot — fetch from API + backfill DB
				try {
					const bm = await getBeatmap(slot.beatmapId);
					const coverUrl = await proxyImage(bm.beatmapset.covers['card@2x']);
					const listCoverUrl = await proxyImage(bm.beatmapset.covers['list@2x']);

					beatmapCache[slot.beatmapId] = {
						title: bm.beatmapset.title,
						artist: bm.beatmapset.artist,
						version: bm.version,
						starRating: bm.difficulty_rating,
						bpm: bm.bpm,
						totalLength: bm.total_length,
						coverUrl,
						listCoverUrl
					};

					// Backfill so future loads are instant
					await db
						.update(mappoolSlot)
						.set({
							title: bm.beatmapset.title,
							artist: bm.beatmapset.artist,
							version: bm.version,
							coverUrl,
							listCoverUrl,
							starRating: bm.difficulty_rating,
							bpm: bm.bpm,
							totalLength: bm.total_length
						})
						.where(eq(mappoolSlot.id, slot.id));
				} catch {
					/* skip */
				}
			})
		);
	}

	const isStaff = hasRole(locals.user.role, 'referee');

	// Fetch player usernames for lobby status display
	const playerNames: Record<string, string> = {};
	for (const p of m.participants) {
		for (const pl of p.players) {
			const u = await db.query.user.findFirst({ where: eq(user.id, pl.userId) });
			if (u?.name) playerNames[pl.userId] = u.name;
		}
	}

	const lobbyStatus = getLobbyStatus(params.id);

	const playerRatings: Record<string, { elo: number; wins: number; losses: number }> = {};
	for (const p of m.participants) {
		for (const pl of p.players) {
			const rating = await db.query.playerRating.findFirst({
				where: eq(playerRating.userId, pl.userId)
			});
			if (rating) {
				playerRatings[pl.userId] = { elo: rating.elo, wins: rating.wins, losses: rating.losses };
			}
		}
	}

	return {
		match: m,
		beatmapCache,
		userId: locals.user.id,
		isStaff,
		lobbyStatus,
		playerNames,
		playerRatings
	};
};

export const actions: Actions = {
	reinvite: async ({ params, locals }) => {
		if (!locals.user) redirect(302, '/');

		const lobby = getLobby(params.id);
		if (!lobby) return { error: 'No active IRC lobby for this match' };

		// Only invite the currently logged-in user
		const u = await db.query.user.findFirst({ where: eq(user.id, locals.user.id) });
		if (u?.name) {
			await lobby.invite(u.name);
			return { reinvited: [u.name] };
		}

		return { error: 'Could not find your username' };
	},

	roll: async ({ params, locals }) => {
		if (!locals.user) redirect(302, '/');

		const m = await getMatchFull(params.id);

		// Find the participant linked to the current user
		let myParticipant = m.participants.find((p) =>
			p.players.some((pl) => pl.userId === locals.user!.id)
		);

		if (!myParticipant) {
			return { error: 'You are not in this match' };
		}

		// For same-team testing: if user is on both sides, pick the one that hasn't rolled yet
		if (myParticipant.rollValue !== null) {
			const unrolled = m.participants.find((p) => p.rollValue === null);
			if (unrolled) {
				myParticipant = unrolled;
			} else {
				return { error: 'All participants have already rolled' };
			}
		}

		const isLastRoll = m.participants.filter((p) => p.rollValue === null).length === 1;
		const value = Math.floor(Math.random() * 100) + 1;
		await submitRoll(params.id, myParticipant.id, value);

		// Announce in IRC lobby
		const lobby = getLobby(params.id);
		if (lobby) {
			lobby
				.chat(`${myParticipant.team?.name ?? 'Player'} rolled ${value} (via web)`)
				.catch(() => {});

			// Check if all rolled → announce pick order or tie
			const updated = await getMatchFull(params.id);
			if (updated.state === 'PICKING') {
				const sorted = [...updated.participants].sort(
					(a: any, b: any) => (a.pickOrder ?? 99) - (b.pickOrder ?? 99)
				);
				const rollConfig = updated.config as MatchConfig;
				const rollWinsNeeded = Math.ceil(rollConfig.bestOf / 2);
				const isTBRoll = updated.participants.every((p: any) => p.score === rollWinsNeeded - 1);

				if (isTBRoll) {
					lobby
						.chat(
							`Rolls complete! ${sorted[0]?.team.name} picks the tiebreaker. Use !pick TB<n> or pick in web UI.`
						)
						.catch(() => {});
				} else {
					lobby
						.chat(
							`Rolls complete! ${sorted[0]?.team.name} picks first. Use !pick <slot> (e.g. !pick NM1) or pick in web UI.`
						)
						.catch(() => {});
				}
			} else if (isLastRoll && updated.participants.every((p: any) => p.rollValue === null)) {
				lobby.chat(`Tie! All players rolled ${value}. Please !roll again.`).catch(() => {});
			}
		}

		return { rolled: value, participantId: myParticipant.id };
	},

	pick: async ({ params, request, locals }) => {
		if (!locals.user) redirect(302, '/');

		const form = await request.formData();
		const slotId = form.get('slotId')?.toString();
		if (!slotId) return { error: 'No map selected' };

		const m = await getMatchFull(params.id);

		// Find the expected picker based on pick order and game count
		const sorted = [...m.participants].sort((a, b) => (a.pickOrder ?? 99) - (b.pickOrder ?? 99));
		const expectedIdx = m.games.length % sorted.length;
		const expectedPicker = sorted[expectedIdx];

		if (!expectedPicker) return { error: 'Cannot determine picker' };

		// ── Verify the logged-in user is on the expected picker's team ──
		// No staff bypass here — even admins can't pick for another team
		const isOnPickerTeam = expectedPicker.players.some((pl) => pl.userId === locals.user!.id);
		if (!isOnPickerTeam) {
			return { error: "It's not your turn to pick" };
		}

		// ── Tiebreaker restrictions ──
		const config = m.config as MatchConfig;
		const winsNeeded = Math.ceil(config.bestOf / 2);
		const allAtMatchPoint = m.participants.every((p) => p.score === winsNeeded - 1);
		const slot = m.mappool?.slots?.find((s) => s.id === slotId);

		if (slot?.category === 'TB' && !allAtMatchPoint) {
			return { error: 'Tiebreaker can only be picked when both teams are at match point' };
		}
		if (allAtMatchPoint && slot?.category !== 'TB') {
			return { error: 'Only tiebreaker maps can be picked at match point' };
		}

		try {
			const game = await pickMap(params.id, expectedPicker.id, slotId);

			// Set map + mods in IRC lobby and start game (background)
			playPickedMap(params.id, game.id).catch((err) =>
				log.match.error({ err, matchId: params.id, gameId: game.id }, 'IRC play failed')
			);

			return { picked: true, gameId: game.id };
		} catch (e: any) {
			return { error: e.message };
		}
	},

	forceStart: async ({ params, locals }) => {
		if (!locals.user) redirect(302, '/');
		// Only staff can force start
		if (!hasRole(locals.user.role, 'referee')) {
			return { error: 'Only referees and admins can force start' };
		}
		await forceStartGame(params.id);
		return { started: true };
	},

	cancel: async ({ params, locals }) => {
		if (!locals.user) redirect(302, '/');
		// Only staff can cancel matches
		if (!hasRole(locals.user.role, 'referee')) {
			return { error: 'Only referees and admins can cancel matches' };
		}

		await cancelMatch(params.id);
		await closeLobby(params.id);
		redirect(303, '/matches');
	}
};
