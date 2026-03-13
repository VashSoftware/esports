import * as Sentry from '@sentry/sveltekit';

Sentry.init({
	dsn: process.env.PUBLIC_SENTRY_DSN,
	tracesSampleRate: 0.2,
	environment: process.env.NODE_ENV ?? 'development',
	sendDefaultPii: true
});
