// src/routes/(app)/+layout.server.ts
import type { LayoutServerLoad } from './$types';
import { isRootAdmin } from '$lib/server/permissions';
import { db } from '$lib/server/db';
import { match, matchParticipant, matchParticipantPlayer } from '$lib/server/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { getUnreadCount } from '$lib/server/notifications';

export const load: LayoutServerLoad = async ({ locals }) => {
	let activeMatch: { id: string; name: string | null; state: string } | null = null;
	let unreadNotificationCount = 0;

	if (locals.user) {
		const [rows, notifCount] = await Promise.all([
			db
				.select({ id: match.id, name: match.name, state: match.state })
				.from(matchParticipantPlayer)
				.innerJoin(matchParticipant, eq(matchParticipantPlayer.participantId, matchParticipant.id))
				.innerJoin(match, eq(matchParticipant.matchId, match.id))
				.where(
					and(
						eq(matchParticipantPlayer.userId, locals.user.id),
						inArray(match.state, ['CREATED', 'LOBBY', 'ROLLING', 'PICKING', 'PLAYING'])
					)
				)
				.limit(1),
			getUnreadCount(locals.user.id)
		]);

		activeMatch = rows[0] ?? null;
		unreadNotificationCount = notifCount;
	}

	return {
		user: locals.user
			? {
					id: locals.user.id,
					name: locals.user.name,
					email: locals.user.email,
					image: locals.user.image,
					role: locals.user.role ?? 'player',
					isRootAdmin: isRootAdmin(locals.user.email)
				}
			: null,
		activeMatch,
		unreadNotificationCount
	};
};
