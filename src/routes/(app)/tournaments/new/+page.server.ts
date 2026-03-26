import { redirect } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/permissions';
import { createTournament } from '$lib/server/tournament/lifecycle';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	requireAuth(locals);
	return {};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const user = requireAuth(locals);
		const form = await request.formData();

		const name = form.get('name')?.toString()?.trim();
		const description = form.get('description')?.toString()?.trim();
		const format = form.get('format')?.toString() as
			| 'single_elim'
			| 'double_elim'
			| 'groups_bracket';
		const maxSlots = parseInt(form.get('maxSlots')?.toString() ?? '16');
		const teamSize = parseInt(form.get('teamSize')?.toString() ?? '1');
		const scoringType = (form.get('scoringType')?.toString() ?? 'score_v2') as
			| 'score'
			| 'score_v2'
			| 'accuracy'
			| 'combo';
		const startAt = form.get('startAt')?.toString();

		if (!name) return { error: 'Tournament name is required' };
		if (!format) return { error: 'Format is required' };

		let tournamentId: string;
		try {
			const t = await createTournament({
				name,
				description,
				format,
				config: {
					teamSize,
					scoringType
				},
				maxSlots,
				createdBy: user.id,
				startAt: startAt ? new Date(startAt) : undefined
			});
			tournamentId = t.id;
		} catch (e: any) {
			return { error: e.message };
		}

		redirect(303, `/tournaments/${tournamentId}`);
	}
};
