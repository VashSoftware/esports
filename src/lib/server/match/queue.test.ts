import { beforeEach, describe, expect, test, mock } from 'bun:test';
import { MATCH_STATES } from './types';

const mocks = {
	db: {
		query: {
			matchParticipantPlayer: { findMany: mock() },
			playerRating: { findFirst: mock() },
			matchQueue: { findFirst: mock() }
		},
		delete: mock()
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
	matchQueue: {},
	matchParticipantPlayer: {},
	playerRating: {}
}));

mock.module('$lib/server/db/auth.schema', () => ({ account: {} }));

mock.module('$lib/server/osu/api', () => ({
	getUser: mock()
}));

mock.module('$lib/server/match/engine', () => ({
	createMatch: mock()
}));

const { joinQueue } = await import('./queue');

describe('joinQueue', () => {
	beforeEach(() => {
		mocks.db.query.matchParticipantPlayer.findMany.mockReset();
		mocks.db.query.playerRating.findFirst.mockReset();
		mocks.db.query.matchQueue.findFirst.mockReset();
		mocks.db.delete.mockReset();
	});

	test('throws when user is already in an active match', async () => {
		mocks.db.delete.mockReturnValue({
			where: mock(() => ({ returning: mock(() => Promise.resolve([])) }))
		});

		mocks.db.query.matchParticipantPlayer.findMany.mockResolvedValue([
			{
				participant: {
					match: { id: 'match-1', state: MATCH_STATES.PLAYING, createdAt: new Date().toISOString() }
				}
			}
		]);

		await expect(joinQueue('user-1', 'team-1')).rejects.toThrow(
			'You are already in an active match'
		);
		expect(mocks.db.query.playerRating.findFirst).not.toHaveBeenCalled();
	});

	test('throws when user has no rating', async () => {
		mocks.db.delete.mockReturnValue({
			where: mock(() => ({ returning: mock(() => Promise.resolve([])) }))
		});

		mocks.db.query.matchParticipantPlayer.findMany.mockResolvedValue([]);
		mocks.db.query.playerRating.findFirst.mockResolvedValue(null);

		await expect(joinQueue('user-1', 'team-1')).rejects.toThrow(
			'No rating found — please re-register'
		);
	});

	test('throws when user is already in queue', async () => {
		mocks.db.delete.mockReturnValue({
			where: mock(() => ({ returning: mock(() => Promise.resolve([])) }))
		});

		mocks.db.query.matchParticipantPlayer.findMany.mockResolvedValue([]);
		mocks.db.query.playerRating.findFirst.mockResolvedValue({ elo: 1500 });
		mocks.db.query.matchQueue.findFirst.mockResolvedValue({ userId: 'user-1', teamId: 'team-1' });

		await expect(joinQueue('user-1', 'team-1')).rejects.toThrow('Already in queue');
	});
});
