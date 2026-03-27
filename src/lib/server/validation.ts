import { error } from '@sveltejs/kit';
import { z } from 'zod';

// ── Match config schema ──
export const matchConfigSchema = z
	.object({
		bestOf: z.number().int().min(1).max(15),
		teamSize: z.number().int().min(1).max(8),
		teamSizes: z.array(z.number().int().min(1).max(8)).optional(),
		scoringType: z.enum(['score', 'score_v2', 'accuracy', 'combo']),
		warmups: z.number().int().min(0).max(5).optional(),
		bans: z.number().int().min(0).max(10).optional(),
		freemod: z.boolean().optional(),
		forceNoFail: z.boolean().optional(),
		allowEloChange: z.boolean().optional(),
		description: z.string().max(500).optional()
	})
	.strict();

export type ValidatedMatchConfig = z.infer<typeof matchConfigSchema>;

// ── Match creation ──
export const createMatchSchema = z.object({
	name: z.string().min(1).max(200),
	config: matchConfigSchema,
	mappoolId: z.string().uuid(),
	teams: z.array(z.string().uuid()).min(2).max(2)
});

// ── Invite creation ──
export const createInviteSchema = z.object({
	creatorTeamId: z.string().uuid(),
	invitedTeamId: z.string().uuid(),
	config: matchConfigSchema,
	mappoolId: z.string().uuid(),
	name: z.string().max(200).optional(),
	message: z.string().max(500).optional(),
	scheduledAt: z.string().datetime().nullable().optional()
});

// ── Score submission ──
const scoreEntrySchema = z.object({
	playerId: z.string().uuid(),
	score: z.number().int().min(0),
	accuracy: z.number().min(0).max(100).optional(),
	maxCombo: z.number().int().min(0).optional(),
	count300: z.number().int().min(0).optional(),
	count100: z.number().int().min(0).optional(),
	count50: z.number().int().min(0).optional(),
	countMiss: z.number().int().min(0).optional(),
	mods: z.array(z.string()).optional(),
	passed: z.boolean().optional(),
	pp: z.number().min(0).nullable().optional()
});

export const submitScoreSchema = z.object({
	matchGameId: z.string().uuid(),
	scores: z.array(scoreEntrySchema).min(1).max(16)
});

// ── Mappool creation ──
export const createMappoolSchema = z.object({
	name: z
		.string()
		.max(200)
		.transform((s) => s.trim())
		.pipe(z.string().min(1, 'Name cannot be empty'))
});

// ── Mappool slot creation ──
export const createMappoolSlotSchema = z.object({
	beatmapId: z.union([z.string(), z.number()]).transform(String),
	category: z
		.string()
		.min(1)
		.max(10)
		.transform((s) => s.toUpperCase()),
	mods: z.array(z.string()).optional()
});

// ── Roll submission ──
export const submitRollSchema = z.object({
	value: z.number().int().min(1).max(100)
});

// ── Pick submission ──
export const pickMapSchema = z.object({
	mappoolSlotId: z.string().uuid()
});

/**
 * Parse request body with a zod schema. Throws SvelteKit error(400) on failure.
 */
export function parseBody<T>(schema: z.ZodType<T>, data: unknown): T {
	const result = schema.safeParse(data);
	if (!result.success) {
		const issues = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
		error(400, `Validation failed: ${issues}`);
	}
	return result.data;
}
