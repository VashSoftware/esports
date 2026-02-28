import { user } from '$lib/server/db/schema';
import { db } from '$lib/server/db';
import { getMatchFull, submitRoll, pickMap, cancelMatch } from '$lib/server/match/engine';
import { playPickedMap, closeLobby, forceStartGame } from '$lib/server/match/orchestrator';
import { getLobby } from '$lib/server/bancho/client';
import { error, redirect } from '@sveltejs/kit';
import { getBeatmap } from '$lib/server/osu/api';
import { hasRole } from '$lib/server/permissions';
import type { PageServerLoad, Actions } from './$types';
import { eq } from 'drizzle-orm';
import type { MatchConfig } from '$lib/server/match/types';


export const load: PageServerLoad = async ({ params, locals }) => {
	if (!locals.user) redirect(302, '/');

	let m;
	try {
		m = await getMatchFull(params.id);
	} catch {
		error(404, 'Match not found');
	}

	// Build beatmap metadata cache for all slots in the mappool
	const beatmapCache: Record<string, any> = {};
	if (m.mappool?.slots) {
		await Promise.allSettled(
			m.mappool.slots.map(async (slot) => {
				try {
					const bm = await getBeatmap(slot.beatmapId);
					beatmapCache[slot.beatmapId] = {
						title: bm.beatmapset.title,
						artist: bm.beatmapset.artist,
						version: bm.version,
						starRating: bm.difficulty_rating,
						bpm: bm.bpm,
						totalLength: bm.total_length,
						coverUrl: bm.beatmapset.covers['card@2x'],
						listCoverUrl: bm.beatmapset.covers['list@2x']
					};
				} catch { /* skip */ }
			})
		);
	}

	const isStaff = hasRole(locals.user.role, 'referee');

	return { match: m, beatmapCache, userId: locals.user.id, isStaff };
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

		const value = Math.floor(Math.random() * 100) + 1;
		await submitRoll(params.id, myParticipant.id, value);

		// Announce in IRC lobby
		const lobby = getLobby(params.id);
		if (lobby) {
			lobby.chat(`${myParticipant.team?.name ?? 'Player'} rolled ${value} (via web)`).catch(() => {});

			// Check if all rolled → announce pick order
			const updated = await getMatchFull(params.id);
			if (updated.state === 'PICKING') {
				const sorted = [...updated.participants].sort(
					(a: any, b: any) => (a.pickOrder ?? 99) - (b.pickOrder ?? 99)
				);
				lobby.chat(
					`Rolls complete! ${sorted[0]?.team.name} picks first. Use !pick <slot> (e.g. !pick NM1) or pick in web UI.`
				).catch(() => {});
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
		const sorted = [...m.participants].sort(
			(a, b) => (a.pickOrder ?? 99) - (b.pickOrder ?? 99)
		);
		const expectedIdx = m.games.length % sorted.length;
		const expectedPicker = sorted[expectedIdx];

		if (!expectedPicker) return { error: 'Cannot determine picker' };

		// ── Verify the logged-in user is on the expected picker's team ──
		// No staff bypass here — even admins can't pick for another team
		const isOnPickerTeam = expectedPicker.players.some(
			(pl) => pl.userId === locals.user!.id
		);
		if (!isOnPickerTeam) {
			return { error: "It's not your turn to pick" };
		}

		// ── Tiebreaker restriction ──
		// TB maps can only be picked when both teams are at match point (e.g. 2-2 in BO5)
		const config = m.config as MatchConfig;
		const winsNeeded = Math.ceil(config.bestOf / 2);
		const slot = m.mappool?.slots?.find((s) => s.id === slotId);
		if (slot?.category === 'TB') {
			const allAtMatchPoint = m.participants.every((p) => p.score === winsNeeded - 1);
			if (!allAtMatchPoint) {
				return { error: 'Tiebreaker can only be picked when both teams are at match point' };
			}
		}

		try {
			const game = await pickMap(params.id, expectedPicker.id, slotId);

			// Set map + mods in IRC lobby and start game (background)
			playPickedMap(params.id, game.id).catch((err) =>
				console.error('[Match] IRC play failed:', err.message)
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
