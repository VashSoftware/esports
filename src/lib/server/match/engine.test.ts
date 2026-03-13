import { beforeEach, describe, expect, test, vi } from 'vitest';
import { MATCH_STATES } from './types';

const mocks = {
	db: {
		query: {
			match: { findFirst: vi.fn() },
			matchParticipant: { findMany: vi.fn() },
			matchGame: { findMany: vi.fn() },
			mappoolSlot: { findFirst: vi.fn() }
		},
		insert: vi.fn(),
		update: vi.fn(),
		delete: vi.fn(),
		select: vi.fn()
	},
	helpers: {
		getMatchOrThrow: vi.fn(),
		getExpectedPicker: vi.fn(),
		assertState: vi.fn(),
		getMatchFull: vi.fn()
	}
};

vi.mock('$lib/server/db', () => ({ db: mocks.db }));

vi.mock('drizzle-orm', () => ({
	eq: vi.fn(() => ({})),
	and: vi.fn(() => ({})),
	asc: vi.fn(() => ({})),
	lt: vi.fn(() => ({})),
	inArray: vi.fn(() => ({})),
	sql: vi.fn(() => ({})),
	isNotNull: vi.fn(() => ({}))
}));

vi.mock('$lib/server/db/schema', () => ({
	match: {},
	matchParticipant: {},
	matchParticipantPlayer: {},
	matchGame: {},
	matchGameScore: {},
	matchQueue: {},
	mappoolSlot: {},
	playerRating: {},
	teamMember: {}
}));

vi.mock('$lib/server/db/auth.schema', () => ({ account: {} }));

vi.mock('$lib/server/discord/client', () => ({
	notifyMatchCreated: vi.fn(),
	notifyMatchFinished: vi.fn()
}));

vi.mock('$lib/server/osu/api', () => ({
	getUser: vi.fn()
}));

vi.mock('./helpers', () => ({
	getExpectedPicker: (...args: unknown[]) => mocks.helpers.getExpectedPicker(...args),
	getMatchOrThrow: (...args: unknown[]) => mocks.helpers.getMatchOrThrow(...args),
	assertState: (...args: unknown[]) => mocks.helpers.assertState(...args),
	getMatchFull: (...args: unknown[]) => mocks.helpers.getMatchFull(...args)
}));

vi.mock('./rating', () => ({
	updateElo: vi.fn(),
	calculateInitialElo: vi.fn(),
	selectMappoolForRating: vi.fn()
}));

const { pickMap } = await import('./engine');

describe('pickMap', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		// getMatchOrThrow returns a match object
		mocks.helpers.getMatchOrThrow.mockResolvedValue({
			id: 'match-1',
			state: MATCH_STATES.PICKING,
			config: { bestOf: 5, teamSize: 1, scoringType: 'score_v2' }
		});

		// db.query.matchParticipant.findMany returns participants
		mocks.db.query.matchParticipant.findMany.mockResolvedValue([
			{ id: 'p1', pickOrder: 1, score: 1 },
			{ id: 'p2', pickOrder: 2, score: 1 }
		]);

		// db.query.matchGame.findMany returns no games played yet
		mocks.db.query.matchGame.findMany.mockResolvedValue([]);

		// getExpectedPicker returns p1 (first picker)
		mocks.helpers.getExpectedPicker.mockReturnValue({ id: 'p1', pickOrder: 1, score: 1 });
	});

	test('throws when a non-current picker tries to pick', async () => {
		await expect(pickMap('match-1', 'p2', 'slot-1')).rejects.toThrow('Not your turn to pick');
		expect(mocks.db.query.mappoolSlot.findFirst).not.toHaveBeenCalled();
	});

	test('rejects tiebreaker picks before match point', async () => {
		mocks.db.query.mappoolSlot.findFirst.mockResolvedValue({
			id: 'slot-tb',
			category: 'TB'
		});

		await expect(pickMap('match-1', 'p1', 'slot-tb')).rejects.toThrow(
			'Tiebreaker can only be picked at match point'
		);
		expect(mocks.db.insert).not.toHaveBeenCalled();
	});
});
