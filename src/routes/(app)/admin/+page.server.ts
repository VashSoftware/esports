// src/routes/(app)/admin/+page.server.ts
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
import { eq, desc, inArray, sql } from 'drizzle-orm';
import { requireRole, setUserRole, isRootAdmin } from '$lib/server/permissions';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	requireRole(locals, 'admin');

	const users = await db.query.user.findMany({
		orderBy: desc(user.createdAt)
	});

	const usersWithRatings = await Promise.all(
		users.map(async (u) => {
			const rating = await db.query.playerRating.findFirst({
				where: eq(playerRating.userId, u.id)
			});
			return {
				id: u.id,
				name: u.name,
				email: u.email,
				image: u.image,
				role: u.role ?? 'player',
				createdAt: u.createdAt,
				elo: rating?.elo ?? 1000,
				wins: rating?.wins ?? 0,
				losses: rating?.losses ?? 0,
				isRootAdmin: isRootAdmin(u.email)
			};
		})
	);

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
		users: usersWithRatings,
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
		requireRole(locals, 'admin');

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
			// setUserRole throws SvelteKit errors; extract the message
			return { error: e.body?.message ?? e.message ?? 'Failed to update role' };
		}

		return { success: true };
	},

	cancelAllMatches: async ({ locals }) => {
		requireRole(locals, 'admin');

		const cancelled = await db
			.update(match)
			.set({ state: 'CANCELLED', finishedAt: new Date() })
			.where(inArray(match.state, ['CREATED', 'LOBBY', 'ROLLING', 'PICKING', 'PLAYING']))
			.returning({ id: match.id });

		await db.delete(matchQueue);

		return { success: true, message: `Cancelled ${cancelled.length} match${cancelled.length !== 1 ? 'es' : ''} and cleared queue` };
	},

	clearQueue: async ({ locals }) => {
		requireRole(locals, 'admin');
		const deleted = await db.delete(matchQueue).returning({ id: matchQueue.id });
		return { success: true, message: `Removed ${deleted.length} queue entr${deleted.length !== 1 ? 'ies' : 'y'}` };
	},

	expireInvites: async ({ locals }) => {
		requireRole(locals, 'admin');
		const expired = await db
			.update(matchInvite)
			.set({ status: 'expired' })
			.where(eq(matchInvite.status, 'pending'))
			.returning({ id: matchInvite.id });
		return { success: true, message: `Expired ${expired.length} pending invite${expired.length !== 1 ? 's' : ''}` };
	},

	clearNotifications: async ({ locals }) => {
		requireRole(locals, 'admin');
		const deleted = await db.delete(notification).returning({ id: notification.id });
		return { success: true, message: `Cleared ${deleted.length} notification${deleted.length !== 1 ? 's' : ''}` };
	},

	resetRatings: async ({ locals }) => {
		requireRole(locals, 'admin');
		const reset = await db
			.update(playerRating)
			.set({ elo: sql`COALESCE(initial_elo, 1000)`, wins: 0, losses: 0, updatedAt: new Date() })
			.returning({ id: playerRating.id });
		return { success: true, message: `Reset ${reset.length} rating${reset.length !== 1 ? 's' : ''} to initial ELO` };
	},

	clearMatchHistory: async ({ locals }) => {
		requireRole(locals, 'admin');

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
