// src/routes/(app)/+layout.server.ts
import type { LayoutServerLoad } from './$types';
import { isRootAdmin } from '$lib/server/permissions';

export const load: LayoutServerLoad = async ({ locals }) => {
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
			: null
	};
};
