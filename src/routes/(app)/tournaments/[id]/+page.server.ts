import { error, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import {
	tournament,
	tournamentRound,
	tournamentMatch,
	tournamentRegistration,
	tournamentGroup,
	tournamentGroupEntry,
	tournamentStaff,
	teamMember,
	mappool
} from '$lib/server/db/schema';
import { eq, and, asc, desc } from 'drizzle-orm';
import { requireAuth } from '$lib/server/permissions';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	requireAuth(locals);

	const t = await db.query.tournament.findFirst({
		where: eq(tournament.id, params.id),
		with: {
			rounds: {
				orderBy: [asc(tournamentRound.roundOrder)],
				with: { mappool: { with: { slots: true } } }
			},
			registrations: {
				with: { team: true },
				orderBy: [asc(tournamentRegistration.seed), asc(tournamentRegistration.registeredAt)]
			},
			staff: true,
			groups: {
				with: {
					entries: { with: { team: true } }
				}
			}
		}
	});

	if (!t) error(404, 'Tournament not found');

	const matches = await db.query.tournamentMatch.findMany({
		where: eq(tournamentMatch.tournamentId, params.id),
		with: {
			round: true,
			team1: true,
			team2: true,
			winner: true,
			match: {
				with: {
					participants: {
						with: { team: true },
						orderBy: (p: any, { asc }: any) => [asc(p.slot)]
					}
				}
			}
		}
	});

	// check if current user is staff
	const isStaff = t.staff.some((s) => s.userId === locals.user!.id);

	// check if current user is registered
	const userTeams = await db.query.teamMember.findMany({
		where: eq(teamMember.userId, locals.user!.id),
		with: { team: true }
	});

	const userRegistration = t.registrations.find((r) =>
		userTeams.some((ut) => ut.teamId === r.teamId)
	);

	// load mappools for round config (staff only in DRAFT)
	let mappools: { id: string; name: string; slotCount: number }[] = [];
	if (isStaff) {
		const allMappools = await db.query.mappool.findMany({
			with: { slots: { columns: { id: true } } },
			orderBy: desc(mappool.createdAt)
		});
		mappools = allMappools.map((m) => ({
			id: m.id,
			name: m.name,
			slotCount: m.slots.length
		}));
	}

	return {
		tournament: t,
		matches,
		isStaff,
		userTeams: userTeams.map((ut) => ut.team),
		userRegistration,
		mappools
	};
};

export const actions: Actions = {
	register: async ({ params, request, locals }) => {
		const user = requireAuth(locals);
		const form = await request.formData();
		const teamId = form.get('teamId')?.toString();

		if (!teamId) return { error: 'Select a team' };

		const { registerForTournament } = await import('$lib/server/tournament/lifecycle');
		try {
			await registerForTournament(params.id, teamId, user.id);
			return { success: true };
		} catch (e: any) {
			return { error: e.message };
		}
	},

	withdraw: async ({ params, request, locals }) => {
		requireAuth(locals);
		const form = await request.formData();
		const teamId = form.get('teamId')?.toString();

		if (!teamId) return { error: 'Missing teamId' };

		const { withdrawFromTournament } = await import('$lib/server/tournament/lifecycle');
		try {
			await withdrawFromTournament(params.id, teamId);
			return { withdrawn: true };
		} catch (e: any) {
			return { error: e.message };
		}
	},

	openRegistration: async ({ params, locals }) => {
		requireAuth(locals);
		const { openRegistration } = await import('$lib/server/tournament/lifecycle');
		try {
			await openRegistration(params.id);
		} catch (e: any) {
			return { error: e.message };
		}
	},

	closeRegistration: async ({ params, locals }) => {
		requireAuth(locals);
		const { closeRegistration } = await import('$lib/server/tournament/lifecycle');
		try {
			await closeRegistration(params.id);
		} catch (e: any) {
			return { error: e.message };
		}
	},

	finalizeSeeding: async ({ params, locals }) => {
		requireAuth(locals);
		const { finalizeSeeding } = await import('$lib/server/tournament/lifecycle');
		try {
			await finalizeSeeding(params.id);
		} catch (e: any) {
			return { error: e.message };
		}
	},

	cancel: async ({ params, locals }) => {
		requireAuth(locals);
		const { cancelTournament } = await import('$lib/server/tournament/lifecycle');
		try {
			await cancelTournament(params.id);
		} catch (e: any) {
			return { error: e.message };
		}
	},

	addRound: async ({ params, request, locals }) => {
		requireAuth(locals);
		const form = await request.formData();

		const name = form.get('name')?.toString()?.trim();
		const abbreviation = form.get('abbreviation')?.toString()?.trim() || null;
		const bestOf = parseInt(form.get('bestOf')?.toString() ?? '5');
		const mappoolId = form.get('mappoolId')?.toString() || null;
		const scheduledAt = form.get('scheduledAt')?.toString();

		if (!name) return { error: 'Round name is required' };
		if (bestOf < 1 || bestOf % 2 === 0) return { error: 'Best of must be an odd number' };

		// get current max round order
		const existing = await db.query.tournamentRound.findMany({
			where: eq(tournamentRound.tournamentId, params.id),
			orderBy: [desc(tournamentRound.roundOrder)]
		});
		const nextOrder = existing.length > 0 ? existing[0].roundOrder + 1 : 0;

		try {
			await db.insert(tournamentRound).values({
				tournamentId: params.id,
				name,
				abbreviation,
				roundOrder: nextOrder,
				bestOf,
				mappoolId: mappoolId || null,
				scheduledAt: scheduledAt ? new Date(scheduledAt) : null
			});
			return { roundAdded: true };
		} catch (e: any) {
			return { error: e.message };
		}
	},

	updateRound: async ({ params, request, locals }) => {
		requireAuth(locals);
		const form = await request.formData();

		const roundId = form.get('roundId')?.toString();
		const name = form.get('name')?.toString()?.trim();
		const abbreviation = form.get('abbreviation')?.toString()?.trim() || null;
		const bestOf = parseInt(form.get('bestOf')?.toString() ?? '5');
		const mappoolId = form.get('mappoolId')?.toString() || null;
		const scheduledAt = form.get('scheduledAt')?.toString();

		if (!roundId) return { error: 'Missing roundId' };
		if (!name) return { error: 'Round name is required' };

		try {
			await db
				.update(tournamentRound)
				.set({
					name,
					abbreviation,
					bestOf,
					mappoolId: mappoolId || null,
					scheduledAt: scheduledAt ? new Date(scheduledAt) : null
				})
				.where(and(eq(tournamentRound.id, roundId), eq(tournamentRound.tournamentId, params.id)));
			return { roundUpdated: true };
		} catch (e: any) {
			return { error: e.message };
		}
	},

	deleteRound: async ({ params, request, locals }) => {
		requireAuth(locals);
		const form = await request.formData();
		const roundId = form.get('roundId')?.toString();

		if (!roundId) return { error: 'Missing roundId' };

		try {
			await db
				.delete(tournamentRound)
				.where(and(eq(tournamentRound.id, roundId), eq(tournamentRound.tournamentId, params.id)));
			return { roundDeleted: true };
		} catch (e: any) {
			return { error: e.message };
		}
	},

	addStaff: async ({ params, request, locals }) => {
		requireAuth(locals);
		const form = await request.formData();
		const userId = form.get('userId')?.toString();
		const role = form.get('role')?.toString() ?? 'referee';

		if (!userId) return { error: 'User is required' };

		try {
			await db.insert(tournamentStaff).values({
				tournamentId: params.id,
				userId,
				role
			});
			return { staffAdded: true };
		} catch (e: any) {
			return { error: e.message };
		}
	},

	removeStaff: async ({ params, request, locals }) => {
		requireAuth(locals);
		const form = await request.formData();
		const staffId = form.get('staffId')?.toString();

		if (!staffId) return { error: 'Missing staffId' };

		try {
			await db
				.delete(tournamentStaff)
				.where(and(eq(tournamentStaff.id, staffId), eq(tournamentStaff.tournamentId, params.id)));
			return { staffRemoved: true };
		} catch (e: any) {
			return { error: e.message };
		}
	}
};
