// src/hooks.server.ts
import type { Handle, HandleServerError } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { building } from '$app/environment';
import * as Sentry from '@sentry/sveltekit';

if (!building) {
	Sentry.init({
		dsn: process.env.PUBLIC_SENTRY_DSN,
		tracesSampleRate: 1.0, // TODO: lower to 0.2–0.3 once past alpha
		environment: process.env.NODE_ENV ?? 'development',
		sendDefaultPii: true
	});
}

import { auth } from '$lib/server/auth';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { db } from '$lib/server/db';
import { user as userTable } from '$lib/server/db/auth.schema';
import { eq } from 'drizzle-orm';
import { ensureRootAdminRole } from '$lib/server/permissions';
import { checkRateLimit } from '$lib/server/rate-limit';
import { log } from '$lib/server/logger';
import { metrics } from '$lib/server/metrics';

// ── Initialize the IRC DM handler once on server startup ──
if (!building) {
	import('$lib/server/bancho/dm-handler')
		.then(({ initDMHandler }) => initDMHandler())
		.catch((err) => log.dm.warn({ err: err.message }, 'DM handler init skipped'));

	process.on('unhandledRejection', (reason) => {
		log.http.error({ err: reason }, 'Unhandled rejection');
	});

	process.on('uncaughtException', (err) => {
		log.http.fatal({ err }, 'Uncaught exception');
	});
}

// ── Request logging middleware ──
// Paths that are too noisy to log every time (healthchecks, polling)
const SILENT_PATHS = new Set(['/api/health', '/api/queue']);

const handleRequestLogging: Handle = async ({ event, resolve }) => {
	const requestId = crypto.randomUUID();
	const start = performance.now();

	event.locals.requestId = requestId;

	const response = await resolve(event);

	const duration = Math.round(performance.now() - start);
	const path = event.url.pathname;
	const status = response.status;

	// Always count metrics, but only log interesting requests
	metrics.requestCount++;
	metrics.totalResponseTime += duration;

	const isSilent = SILENT_PATHS.has(path) && status < 400;

	if (!isSilent) {
		const userId = event.locals.user?.id;
		log.http.info(
			{
				requestId,
				method: event.request.method,
				path,
				status,
				duration,
				userId: userId ?? null,
				ip: event.getClientAddress()
			},
			`${event.request.method} ${path} ${status} ${duration}ms`
		);
	}

	if (duration > 1000) {
		log.http.warn({ requestId, path, duration }, 'Slow request');
		metrics.slowRequests++;
	}

	response.headers.set('X-Request-Id', requestId);
	return response;
};

// ── Auth + rate limiting ──
const handleBetterAuth: Handle = async ({ event, resolve }) => {
	// Rate limiting for API routes: 600 req/min per IP
	if (event.url.pathname.startsWith('/api/')) {
		const ip = event.getClientAddress();
		const { ok, retryAfter } = checkRateLimit(`api:${ip}`, 600, 60_000);
		if (!ok) {
			return new Response('Too Many Requests', {
				status: 429,
				headers: { 'Retry-After': String(retryAfter ?? 60), 'Content-Type': 'text/plain' }
			});
		}
	}

	const session = await auth.api.getSession({ headers: event.request.headers });

	if (session) {
		event.locals.session = session.session;

		const dbUser = await db.query.user.findFirst({
			where: eq(userTable.id, session.user.id)
		});

		let role = dbUser?.role ?? 'player';

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

export const handle: Handle = sequence(
	Sentry.sentryHandle(),
	handleRequestLogging,
	handleBetterAuth
);

// ── Global server error handler ──
export const handleError: HandleServerError = Sentry.handleErrorWithSentry(({ error, event }) => {
	const err = error instanceof Error ? error : new Error(String(error));
	log.http.error(
		{
			err,
			requestId: event.locals.requestId,
			path: event.url.pathname,
			method: event.request.method
		},
		'Unhandled server error'
	);
	return { message: 'An unexpected error occurred.' };
});
