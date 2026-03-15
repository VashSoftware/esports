// src/hooks.client.ts
import * as Sentry from '@sentry/sveltekit';
import type { HandleClientError } from '@sveltejs/kit';

Sentry.init({
	dsn: import.meta.env.PUBLIC_SENTRY_DSN,
	tracesSampleRate: 1.0, // TODO: lower to 0.2–0.3 once past alpha
	replaysSessionSampleRate: 0.1, // Record 10% of sessions for UX debugging
	replaysOnErrorSampleRate: 1.0, // Always record replay when an error happens
	environment: import.meta.env.MODE,
	sendDefaultPii: true
});

export const handleError: HandleClientError = Sentry.handleErrorWithSentry();
