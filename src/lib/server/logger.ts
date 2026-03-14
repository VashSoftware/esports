// src/lib/server/logger.ts
import pino from 'pino';
import { building } from '$app/environment';

const isProduction = !building && process.env.NODE_ENV === 'production';

// Production: JSON to stdout (Docker captures logs via log driver)
// Dev: pipe through pino-pretty (`bun run dev | bunx pino-pretty`)
export const logger = pino({
	level: isProduction ? 'info' : 'debug',
	base: { service: 'vash-esports' },
	serializers: pino.stdSerializers,
	redact: ['req.headers.authorization', 'req.headers.cookie']
});

// Child loggers per subsystem — maps to existing [Tag] prefixes
export const log = {
	auth: logger.child({ subsystem: 'auth' }),
	bancho: logger.child({ subsystem: 'bancho' }),
	orchestrator: logger.child({ subsystem: 'orchestrator' }),
	queue: logger.child({ subsystem: 'queue' }),
	discord: logger.child({ subsystem: 'discord' }),
	dm: logger.child({ subsystem: 'dm' }),
	r2: logger.child({ subsystem: 'r2' }),
	db: logger.child({ subsystem: 'db' }),
	osu: logger.child({ subsystem: 'osu' }),
	match: logger.child({ subsystem: 'match' }),
	invites: logger.child({ subsystem: 'invites' }),
	rating: logger.child({ subsystem: 'rating' }),
	admin: logger.child({ subsystem: 'admin' }),
	timeout: logger.child({ subsystem: 'timeout' }),
	http: logger.child({ subsystem: 'http' })
};
