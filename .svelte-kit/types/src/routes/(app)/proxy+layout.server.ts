// @ts-nocheck
// src/routes/(app)/+layout.server.ts
import type { LayoutServerLoad } from './$types';

export const load = async ({ locals }: Parameters<LayoutServerLoad>[0]) => {
	return {
		user: locals.user
			? {
					id: locals.user.id,
					name: locals.user.name,
					email: locals.user.email,
					image: locals.user.image,
					role: locals.user.role ?? 'player'
				}
			: null
	};
};
