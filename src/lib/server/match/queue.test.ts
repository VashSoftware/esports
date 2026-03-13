import { beforeEach, describe, expect, test, vi } from 'vitest';
import { MATCH_STATES } from './types';

const mocks = {
	db: {
		query: {
			matchParticipantPlayer: { findMany: vi.fn() },
			playerRating: { findFirst: vi.fn() },
			matchQueue: { findFirst: vi.fn() }
		},
		delete: vi.fn()
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
	matchQueue: {},
	matchParticipantPlayer: {},
	playerRating: {}
}));

vi.mock('$lib/server/db/auth.schema', () => ({ account: {} }));

vi.mock('$lib/server/osu/api', () => ({
	getUser: vi.fn()
}));

vi.mock('$lib/server/match/engine', () => ({
	createMatch: vi.fn()
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
			where: vi.fn(() => ({ returning: vi.fn(() => Promise.resolve([])) }))
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
			where: vi.fn(() => ({ returning: vi.fn(() => Promise.resolve([])) }))
		});

		mocks.db.query.matchParticipantPlayer.findMany.mockResolvedValue([]);
		mocks.db.query.playerRating.findFirst.mockResolvedValue(null);

		await expect(joinQueue('user-1', 'team-1')).rejects.toThrow(
			'No rating found — please re-register'
		);
	});

	test('throws when user is already in queue', async () => {
		mocks.db.delete.mockReturnValue({
			where: vi.fn(() => ({ returning: vi.fn(() => Promise.resolve([])) }))
		});

		mocks.db.query.matchParticipantPlayer.findMany.mockResolvedValue([]);
		mocks.db.query.playerRating.findFirst.mockResolvedValue({ elo: 1500 });
		mocks.db.query.matchQueue.findFirst.mockResolvedValue({ userId: 'user-1', teamId: 'team-1' });

		await expect(joinQueue('user-1', 'team-1')).rejects.toThrow('Already in queue');
	});
});
