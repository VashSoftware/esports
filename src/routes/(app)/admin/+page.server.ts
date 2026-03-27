// src/routes/(app)/admin/+page.server.ts
import { log } from '$lib/server/logger';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/auth.schema';
import {
	playerRating,
	match,
	matchQueue,
	matchInvite,
	notification,
	matchGame,
	matchGameScore,
	matchParticipant,
	matchParticipantPlayer
} from '$lib/server/db/schema';
import { account } from '$lib/server/db/auth.schema';
import { eq, and, inArray, sql } from 'drizzle-orm';
import {
	requirePermission,
	setUserRole,
	isRootAdmin,
	GlobalPermission
} from '$lib/server/permissions';
import { getUser as getOsuUser } from '$lib/server/osu/api';
import {
	parseTableParams,
	buildSearchFilter,
	buildOrderBy,
	buildTableMeta
} from '$lib/server/table';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	requirePermission(locals, GlobalPermission.ADMIN_VIEW);

	const params = parseTableParams(url, { sortBy: 'createdAt', limit: 25 });
	const searchFilter = buildSearchFilter(params.search, [user.name, user.email]);

	const [rows, countResult] = await Promise.all([
		db
			.select({
				id: user.id,
				name: user.name,
				email: user.email,
				image: user.image,
				role: user.role,
				createdAt: user.createdAt,
				elo: playerRating.elo,
				wins: playerRating.wins,
				losses: playerRating.losses
			})
			.from(user)
			.leftJoin(playerRating, eq(user.id, playerRating.userId))
			.where(searchFilter)
			.orderBy(
				buildOrderBy(
					params.sortBy,
					params.sortDir,
					{ name: user.name, createdAt: user.createdAt, elo: playerRating.elo },
					user.createdAt
				)
			)
			.limit(params.limit)
			.offset((params.page - 1) * params.limit),
		db
			.select({ count: sql<number>`count(*)` })
			.from(user)
			.where(searchFilter)
	]);

	const users = rows.map((u) => ({
		...u,
		role: u.role ?? 'player',
		elo: u.elo ?? 1000,
		wins: u.wins ?? 0,
		losses: u.losses ?? 0,
		isRootAdmin: isRootAdmin(u.email)
	}));

	const [activeMatches, queueSize, pendingInvites] = await Promise.all([
		db
			.select({ count: sql<number>`count(*)` })
			.from(match)
			.where(inArray(match.state, ['CREATED', 'LOBBY', 'ROLLING', 'PICKING', 'PLAYING'])),
		db.select({ count: sql<number>`count(*)` }).from(matchQueue),
		db
			.select({ count: sql<number>`count(*)` })
			.from(matchInvite)
			.where(eq(matchInvite.status, 'pending'))
	]);

	return {
		users,
		meta: buildTableMeta(params, Number(countResult[0].count)),
		actorIsRootAdmin: isRootAdmin(locals.user!.email),
		stats: {
			activeMatches: Number(activeMatches[0].count),
			queueSize: Number(queueSize[0].count),
			pendingInvites: Number(pendingInvites[0].count)
		}
	};
};

export const actions: Actions = {
	setRole: async ({ request, locals }) => {
		requirePermission(locals, GlobalPermission.ADMIN_MANAGE_ROLES);

		const form = await request.formData();
		const userId = form.get('userId')?.toString();
		const role = form.get('role')?.toString();

		if (!userId || !role) return { error: 'User ID and role are required' };
		if (!['player', 'referee', 'admin'].includes(role)) {
			return { error: 'Invalid role' };
		}

		try {
			await setUserRole(locals, userId, role as any);
		} catch (e: any) {
			return { error: e.body?.message ?? e.message ?? 'Failed to update role' };
		}

		return { success: true };
	},

	cancelAllMatches: async ({ locals }) => {
		requirePermission(locals, GlobalPermission.ADMIN_CANCEL_MATCHES);

		const cancelled = await db
			.update(match)
			.set({ state: 'CANCELLED', finishedAt: new Date() })
			.where(inArray(match.state, ['CREATED', 'LOBBY', 'ROLLING', 'PICKING', 'PLAYING']))
			.returning({ id: match.id });

		await db.delete(matchQueue);

		return {
			success: true,
			message: `Cancelled ${cancelled.length} match${cancelled.length !== 1 ? 'es' : ''} and cleared queue`
		};
	},

	clearQueue: async ({ locals }) => {
		requirePermission(locals, GlobalPermission.ADMIN_CLEAR_QUEUE);
		const deleted = await db.delete(matchQueue).returning({ id: matchQueue.id });
		return {
			success: true,
			message: `Removed ${deleted.length} queue entr${deleted.length !== 1 ? 'ies' : 'y'}`
		};
	},

	expireInvites: async ({ locals }) => {
		requirePermission(locals, GlobalPermission.ADMIN_MANAGE_USERS);
		const expired = await db
			.update(matchInvite)
			.set({ status: 'expired' })
			.where(eq(matchInvite.status, 'pending'))
			.returning({ id: matchInvite.id });
		return {
			success: true,
			message: `Expired ${expired.length} pending invite${expired.length !== 1 ? 's' : ''}`
		};
	},

	clearNotifications: async ({ locals }) => {
		requirePermission(locals, GlobalPermission.ADMIN_MANAGE_USERS);
		const deleted = await db.delete(notification).returning({ id: notification.id });
		return {
			success: true,
			message: `Cleared ${deleted.length} notification${deleted.length !== 1 ? 's' : ''}`
		};
	},

	resetRatings: async ({ locals }) => {
		requirePermission(locals, GlobalPermission.ADMIN_RESET_RATINGS);

		const allUsers = await db.query.user.findMany();
		let updated = 0;

		for (const u of allUsers) {
			let rank: number | null = null;

			try {
				const osuAccount = await db.query.account.findFirst({
					where: and(eq(account.userId, u.id), eq(account.providerId, 'osu'))
				});
				if (osuAccount?.accountId) {
					const osuUser = await getOsuUser(osuAccount.accountId);
					rank = osuUser?.statistics?.global_rank ?? null;
				}
			} catch {
				// API failure — treat as unranked
			}

			const effectiveRank = rank && rank > 0 ? rank : 10_000_000;
			const rawElo = 3500 - Math.log10(effectiveRank) * 500;
			const elo = Math.round(Math.max(0, Math.min(3500, rawElo)));

			const existing = await db.query.playerRating.findFirst({
				where: eq(playerRating.userId, u.id)
			});

			if (existing) {
				await db
					.update(playerRating)
					.set({
						elo,
						initialElo: elo,
						osuRankAtSeed: rank,
						wins: 0,
						losses: 0,
						updatedAt: new Date()
					})
					.where(eq(playerRating.userId, u.id));
			} else {
				await db.insert(playerRating).values({
					userId: u.id,
					elo,
					initialElo: elo,
					osuRankAtSeed: rank,
					wins: 0,
					losses: 0
				});
			}

			log.admin.info({ name: u.name, rank, elo }, 'reset user rating');
			updated++;
		}

		return {
			success: true,
			message: `Re-seeded ${updated} rating${updated !== 1 ? 's' : ''} from osu! ranks`
		};
	},

	clearMatchHistory: async ({ locals }) => {
		requirePermission(locals, GlobalPermission.ADMIN_CLEAR_DATA);

		await db.delete(matchGameScore);
		await db.delete(matchGame);
		await db.delete(matchParticipantPlayer);
		await db.delete(matchParticipant);
		await db.update(match).set({ winnerId: null });
		await db.delete(match);
		await db.delete(matchQueue);
		await db.delete(matchInvite);
		await db.delete(notification);

		return { success: true, message: 'Cleared all match data, invites, and notifications' };
	}
};
