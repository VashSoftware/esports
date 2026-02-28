// src/hooks.server.ts
import type { Handle } from '@sveltejs/kit';
import { building } from '$app/environment';
import { auth } from '$lib/server/auth';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { db } from '$lib/server/db';
import { user as userTable } from '$lib/server/db/auth.schema';
import { eq } from 'drizzle-orm';
import { ensureRootAdminRole } from '$lib/server/permissions';

// ── Initialize the IRC DM handler once on server startup ──
// This runs when the module is first imported (server boot).
// The dynamic import prevents build-time issues if bancho.js isn't available.
if (!building) {
	import('$lib/server/bancho/dm-handler')
		.then(({ initDMHandler }) => initDMHandler())
		.catch((err) => console.warn('[Hooks] DM handler init skipped:', err.message));
}

const handleBetterAuth: Handle = async ({ event, resolve }) => {
	const session = await auth.api.getSession({ headers: event.request.headers });

	if (session) {
		event.locals.session = session.session;

		// Load fresh role from DB (better-auth doesn't include custom columns)
		const dbUser = await db.query.user.findFirst({
			where: eq(userTable.id, session.user.id)
		});

		let role = dbUser?.role ?? 'player';

		// Auto-promote root admin if env var is set and they're not admin yet
		if (dbUser) {
			role = await ensureRootAdminRole({
				id: dbUser.id,
				email: dbUser.email,
				role
			});
		}

		event.locals.user = {
			...session.user,
			role
		};
	}

	return svelteKitHandler({ event, resolve, auth, building });
};

export const handle: Handle = handleBetterAuth;
