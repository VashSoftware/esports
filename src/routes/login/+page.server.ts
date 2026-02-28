import { redirect } from '@sveltejs/kit';
import { auth } from '$lib/server/auth';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
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
