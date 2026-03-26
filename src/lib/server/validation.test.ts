import { describe, expect, test, vi } from 'vitest';

// Mock SvelteKit error to throw like the real one
vi.mock('@sveltejs/kit', () => ({
	error: (status: number, body: string) => {
		throw { status, body };
	}
}));

const {
	matchConfigSchema,
	createMatchSchema,
	createInviteSchema,
	submitScoreSchema,
	createMappoolSchema,
	createMappoolSlotSchema,
	submitRollSchema,
	pickMapSchema,
	parseBody
} = await import('./validation');

// ── matchConfigSchema ──

describe('matchConfigSchema', () => {
	const validConfig = {
		bestOf: 3,
		teamSize: 1,
		scoringType: 'score_v2' as const
	};

	test('accepts valid minimal config', () => {
		expect(matchConfigSchema.parse(validConfig)).toEqual(validConfig);
	});

	test('accepts valid full config', () => {
		const full = {
			...validConfig,
			teamSizes: [1, 2],
			warmups: 2,
			bans: 1,
			freemod: true,
			forceNoFail: true,
			allowEloChange: false,
			description: 'test match'
		};
		expect(matchConfigSchema.parse(full)).toEqual(full);
	});

	test('rejects bestOf = 0', () => {
		expect(() => matchConfigSchema.parse({ ...validConfig, bestOf: 0 })).toThrow();
	});

	test('rejects bestOf > 15', () => {
		expect(() => matchConfigSchema.parse({ ...validConfig, bestOf: 16 })).toThrow();
	});

	test('rejects non-integer bestOf', () => {
		expect(() => matchConfigSchema.parse({ ...validConfig, bestOf: 3.5 })).toThrow();
	});

	test('rejects invalid scoringType', () => {
		expect(() => matchConfigSchema.parse({ ...validConfig, scoringType: 'invalid' })).toThrow();
	});

	test('rejects extra unknown fields (strict mode)', () => {
		expect(() => matchConfigSchema.parse({ ...validConfig, injectedField: 'malicious' })).toThrow();
	});

	test('rejects teamSize = 0', () => {
		expect(() => matchConfigSchema.parse({ ...validConfig, teamSize: 0 })).toThrow();
	});

	test('rejects teamSize > 8', () => {
		expect(() => matchConfigSchema.parse({ ...validConfig, teamSize: 9 })).toThrow();
	});

	test('rejects description over 500 chars', () => {
		expect(() =>
			matchConfigSchema.parse({ ...validConfig, description: 'a'.repeat(501) })
		).toThrow();
	});

	test('rejects missing required fields', () => {
		expect(() => matchConfigSchema.parse({})).toThrow();
		expect(() => matchConfigSchema.parse({ bestOf: 3 })).toThrow();
		expect(() => matchConfigSchema.parse({ bestOf: 3, teamSize: 1 })).toThrow();
	});
});

// ── createMatchSchema ──

describe('createMatchSchema', () => {
	const uuid1 = '550e8400-e29b-41d4-a716-446655440000';
	const uuid2 = '550e8400-e29b-41d4-a716-446655440001';
	const uuid3 = '550e8400-e29b-41d4-a716-446655440002';

	const validMatch = {
		name: 'Test Match',
		config: { bestOf: 3, teamSize: 1, scoringType: 'score_v2' },
		mappoolId: uuid1,
		teams: [uuid2, uuid3]
	};

	test('accepts valid match creation', () => {
		expect(createMatchSchema.parse(validMatch)).toBeTruthy();
	});

	test('rejects empty name', () => {
		expect(() => createMatchSchema.parse({ ...validMatch, name: '' })).toThrow();
	});

	test('rejects name over 200 chars', () => {
		expect(() => createMatchSchema.parse({ ...validMatch, name: 'a'.repeat(201) })).toThrow();
	});

	test('rejects non-uuid mappoolId', () => {
		expect(() => createMatchSchema.parse({ ...validMatch, mappoolId: 'not-a-uuid' })).toThrow();
	});

	test('rejects teams with less than 2 entries', () => {
		expect(() => createMatchSchema.parse({ ...validMatch, teams: [uuid2] })).toThrow();
	});

	test('rejects teams with more than 2 entries', () => {
		expect(() =>
			createMatchSchema.parse({ ...validMatch, teams: [uuid1, uuid2, uuid3] })
		).toThrow();
	});

	test('rejects non-uuid team ids', () => {
		expect(() => createMatchSchema.parse({ ...validMatch, teams: ['bad', 'ids'] })).toThrow();
	});
});

// ── createInviteSchema ──

describe('createInviteSchema', () => {
	const uuid1 = '550e8400-e29b-41d4-a716-446655440000';
	const uuid2 = '550e8400-e29b-41d4-a716-446655440001';
	const uuid3 = '550e8400-e29b-41d4-a716-446655440002';

	const validInvite = {
		creatorTeamId: uuid1,
		invitedTeamId: uuid2,
		config: { bestOf: 5, teamSize: 2, scoringType: 'score' },
		mappoolId: uuid3
	};

	test('accepts valid minimal invite', () => {
		expect(createInviteSchema.parse(validInvite)).toBeTruthy();
	});

	test('accepts invite with optional fields', () => {
		const full = {
			...validInvite,
			name: 'Cool Match',
			message: 'lets go',
			scheduledAt: '2026-04-01T12:00:00Z'
		};
		expect(createInviteSchema.parse(full)).toBeTruthy();
	});

	test('rejects message over 500 chars', () => {
		expect(() => createInviteSchema.parse({ ...validInvite, message: 'x'.repeat(501) })).toThrow();
	});

	test('rejects invalid scheduledAt format', () => {
		expect(() =>
			createInviteSchema.parse({ ...validInvite, scheduledAt: 'next tuesday' })
		).toThrow();
	});

	test('accepts null scheduledAt', () => {
		expect(createInviteSchema.parse({ ...validInvite, scheduledAt: null })).toBeTruthy();
	});
});

// ── submitScoreSchema ──

describe('submitScoreSchema', () => {
	const uuid1 = '550e8400-e29b-41d4-a716-446655440000';
	const uuid2 = '550e8400-e29b-41d4-a716-446655440001';

	test('accepts valid score submission', () => {
		const valid = {
			matchGameId: uuid1,
			scores: [{ playerId: uuid2, score: 1000000 }]
		};
		expect(submitScoreSchema.parse(valid)).toBeTruthy();
	});

	test('rejects negative score', () => {
		expect(() =>
			submitScoreSchema.parse({
				matchGameId: uuid1,
				scores: [{ playerId: uuid2, score: -1 }]
			})
		).toThrow();
	});

	test('rejects empty scores array', () => {
		expect(() => submitScoreSchema.parse({ matchGameId: uuid1, scores: [] })).toThrow();
	});

	test('rejects scores array over 16 entries', () => {
		const scores = Array.from({ length: 17 }, (_, i) => ({
			playerId: `550e8400-e29b-41d4-a716-4466554400${String(i).padStart(2, '0')}`,
			score: 100
		}));
		expect(() => submitScoreSchema.parse({ matchGameId: uuid1, scores })).toThrow();
	});

	test('rejects non-uuid matchGameId', () => {
		expect(() =>
			submitScoreSchema.parse({
				matchGameId: 'bad',
				scores: [{ playerId: uuid2, score: 100 }]
			})
		).toThrow();
	});
});

// ── createMappoolSchema ──

describe('createMappoolSchema', () => {
	test('accepts valid name', () => {
		expect(createMappoolSchema.parse({ name: 'Pool A' })).toEqual({ name: 'Pool A' });
	});

	test('trims whitespace', () => {
		expect(createMappoolSchema.parse({ name: '  Pool A  ' })).toEqual({ name: 'Pool A' });
	});

	test('rejects empty name', () => {
		expect(() => createMappoolSchema.parse({ name: '' })).toThrow();
	});

	test('rejects whitespace-only name', () => {
		expect(() => createMappoolSchema.parse({ name: '   ' })).toThrow();
	});

	test('rejects name over 200 chars', () => {
		expect(() => createMappoolSchema.parse({ name: 'a'.repeat(201) })).toThrow();
	});
});

// ── createMappoolSlotSchema ──

describe('createMappoolSlotSchema', () => {
	test('accepts valid slot with string beatmapId', () => {
		const result = createMappoolSlotSchema.parse({ beatmapId: '12345', category: 'nm' });
		expect(result).toEqual({ beatmapId: '12345', category: 'NM' });
	});

	test('accepts valid slot with numeric beatmapId', () => {
		const result = createMappoolSlotSchema.parse({ beatmapId: 12345, category: 'hd' });
		expect(result).toEqual({ beatmapId: '12345', category: 'HD' });
	});

	test('uppercases category', () => {
		const result = createMappoolSlotSchema.parse({ beatmapId: '1', category: 'dt' });
		expect(result.category).toBe('DT');
	});

	test('accepts mods array', () => {
		const result = createMappoolSlotSchema.parse({
			beatmapId: '1',
			category: 'fm',
			mods: ['HD', 'HR']
		});
		expect(result.mods).toEqual(['HD', 'HR']);
	});

	test('rejects empty category', () => {
		expect(() => createMappoolSlotSchema.parse({ beatmapId: '1', category: '' })).toThrow();
	});
});

// ── submitRollSchema ──

describe('submitRollSchema', () => {
	test('accepts valid roll', () => {
		expect(submitRollSchema.parse({ value: 50 })).toEqual({ value: 50 });
	});

	test('rejects value = 0', () => {
		expect(() => submitRollSchema.parse({ value: 0 })).toThrow();
	});

	test('rejects value > 100', () => {
		expect(() => submitRollSchema.parse({ value: 101 })).toThrow();
	});

	test('rejects non-integer', () => {
		expect(() => submitRollSchema.parse({ value: 3.14 })).toThrow();
	});

	test('rejects missing value', () => {
		expect(() => submitRollSchema.parse({})).toThrow();
	});
});

// ── pickMapSchema ──

describe('pickMapSchema', () => {
	test('accepts valid uuid', () => {
		const uuid = '550e8400-e29b-41d4-a716-446655440000';
		expect(pickMapSchema.parse({ mappoolSlotId: uuid })).toEqual({ mappoolSlotId: uuid });
	});

	test('rejects non-uuid', () => {
		expect(() => pickMapSchema.parse({ mappoolSlotId: 'not-a-uuid' })).toThrow();
	});

	test('rejects missing field', () => {
		expect(() => pickMapSchema.parse({})).toThrow();
	});
});

// ── parseBody ──

describe('parseBody', () => {
	test('returns parsed data on success', () => {
		const result = parseBody(submitRollSchema, { value: 42 });
		expect(result).toEqual({ value: 42 });
	});

	test('throws sveltekit error with 400 on validation failure', () => {
		try {
			parseBody(submitRollSchema, { value: 'not a number' });
			expect.unreachable('should have thrown');
		} catch (e: any) {
			expect(e.status).toBe(400);
			expect(e.body).toContain('Validation failed');
		}
	});

	test('includes field path in error message', () => {
		try {
			parseBody(createMatchSchema, {
				name: 'test',
				config: { bestOf: 'bad', teamSize: 1, scoringType: 'score' },
				mappoolId: '550e8400-e29b-41d4-a716-446655440000',
				teams: ['550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002']
			});
			expect.unreachable('should have thrown');
		} catch (e: any) {
			expect(e.status).toBe(400);
			expect(e.body).toContain('config.bestOf');
		}
	});
});
