import { beforeEach, describe, expect, test, mock } from 'bun:test';
import { MATCH_STATES } from '../../src/lib/server/match/types';

const mocks = {
	db: {
		query: {
			match: { findFirst: mock() },
			matchParticipant: { findMany: mock() },
			matchGame: { findMany: mock() },
			mappoolSlot: { findFirst: mock() }
		},
		insert: mock(),
		update: mock(),
		delete: mock(),
		select: mock()
	}
};

mock.module('$lib/server/db', () => ({ db: mocks.db }));

mock.module('drizzle-orm', () => ({
	eq: mock(() => ({})),
	and: mock(() => ({})),
	asc: mock(() => ({})),
	lt: mock(() => ({})),
	inArray: mock(() => ({})),
	sql: mock(() => ({})),
	isNotNull: mock(() => ({}))
}));

mock.module('$lib/server/db/schema', () => ({
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

mock.module('$lib/server/db/auth.schema', () => ({ account: {} }));

mock.module('$lib/server/discord/client', () => ({
	notifyMatchCreated: mock(),
	notifyMatchFinished: mock()
}));

mock.module('$lib/server/osu/api', () => ({
	getUser: mock()
}));

const { pickMap } = await import('../../src/lib/server/match/engine');

describe('pickMap', () => {
	beforeEach(() => {
		mocks.db.query.match.findFirst.mockReset();
		mocks.db.query.matchParticipant.findMany.mockReset();
		mocks.db.query.matchGame.findMany.mockReset();
		mocks.db.query.mappoolSlot.findFirst.mockReset();
		mocks.db.insert.mockReset();
		mocks.db.update.mockReset();
		mocks.db.delete.mockReset();
		mocks.db.select.mockReset();

		mocks.db.query.match.findFirst.mockResolvedValue({
			id: 'match-1',
			state: MATCH_STATES.PICKING,
			config: { bestOf: 5, teamSize: 1, scoringType: 'score_v2' }
		});

		mocks.db.query.matchParticipant.findMany.mockResolvedValue([
			{ id: 'p1', pickOrder: 1, score: 1 },
			{ id: 'p2', pickOrder: 2, score: 1 }
		]);

		mocks.db.query.matchGame.findMany.mockResolvedValue([]);
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
