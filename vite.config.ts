import devtoolsJson from 'vite-plugin-devtools-json';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, type Plugin } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import { sveltekit } from '@sveltejs/kit/vite';
import { sentrySvelteKit } from '@sentry/sveltekit';

// Stub import-in-the-middle — its ESM loader hooks are Node-only and crash Bun.
// Sentry's manual error tracking (sentryHandle, captureException) still works;
// only automatic OpenTelemetry instrumentation is disabled.
function stubIITM(): Plugin {
	return {
		name: 'stub-import-in-the-middle',
		resolveId(id) {
			if (id === 'import-in-the-middle' || id.startsWith('import-in-the-middle/')) {
				return '\0iitm-stub';
			}
		},
		load(id) {
			if (id === '\0iitm-stub') {
				return 'export class Hook { constructor() {} enable() {} disable() {} unhook() {} }';
			}
		}
	};
}

export default defineConfig({
	plugins: [
		stubIITM(),
		tailwindcss(),
		sentrySvelteKit({
			org: 'vash-software-vr',
			project: 'esports',
			authToken: process.env.SENTRY_AUTH_TOKEN
		}),
		sveltekit(),
		devtoolsJson()
	],
	ssr: {
		external: ['bun']
	},
	build: {
		rollupOptions: {
			external: ['bun']
		},
		reportCompressedSize: false
	},
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'client',
					browser: {
						enabled: true,
						provider: playwright(),
						instances: [{ browser: 'chromium', headless: true }]
					},
					include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					exclude: ['src/lib/server/**']
				}
			},

			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});
