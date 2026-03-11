import { describe, expect, it, mock } from 'bun:test';
import { MATCH_STATES } from '../../src/lib/server/match/types';

const mocks = {
	db: {
		query: {
			matchParticipantPlayer: { findMany: mock() },
			playerRating: { findFirst: mock() }
		},
		delete: mock()
	}
};

mock.module('$lib/server/db', () => ({ db: mocks.db }));

mock.module('drizzle-orm', () => ({
	eq: mock(() => ({})),
	asc: mock(() => ({})),
	lt: mock(() => ({})),
	inArray: mock(() => ({})),
	sql: mock(() => ({}))
}));

mock.module('$lib/server/db/schema', () => ({
	match: {},
	matchQueue: {},
	matchParticipantPlayer: {},
	playerRating: {}
}));

mock.module('$lib/server/match/engine', () => ({
	createMatch: mock()
}));

const { joinQueue } = await import('../../src/lib/server/match/queue');

describe('joinQueue', () => {
	it('throws when user is already in an active match', async () => {
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

		await expect(joinQueue('user-1', 'team-1')).rejects.toThrow('You are already in an active match');
		expect(mocks.db.query.playerRating.findFirst).not.toHaveBeenCalled();
	});
});
