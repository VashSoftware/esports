// @ts-nocheck
import { redirect } from '@sveltejs/kit';
import { auth } from '$lib/server/auth';
import type { PageServerLoad } from './$types';

export const load = async (event: Parameters<PageServerLoad>[0]) => {
	if (event.locals.user) redirect(302, '/');

	const result = await auth.api.signInSocial({
		body: {
			provider: 'osu',
			callbackURL: '/'
		}
	});

	if (result.url) redirect(302, result.url);

	return {};
};
