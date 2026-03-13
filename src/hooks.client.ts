// src/hooks.client.ts
import * as Sentry from '@sentry/sveltekit';
import type { HandleClientError } from '@sveltejs/kit';

Sentry.init({
	dsn: import.meta.env.PUBLIC_SENTRY_DSN,
	tracesSampleRate: 0.2,
	replaysSessionSampleRate: 0,
	replaysOnErrorSampleRate: 0.5,
	environment: import.meta.env.MODE,
	sendDefaultPii: true
});

export const handleError: HandleClientError = Sentry.handleErrorWithSentry();
