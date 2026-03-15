import { beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = {
	db: {
		query: {
			matchParticipantPlayer: { findMany: vi.fn() },
			playerRating: { findFirst: vi.fn() },
			matchQueue: { findFirst: vi.fn() }
		},
		select: vi.fn(),
		delete: vi.fn()
	}
};

vi.mock('$lib/server/db', () => ({ db: mocks.db }));

vi.mock('drizzle-orm', () => ({
	eq: vi.fn(() => ({})),
	and: vi.fn(() => ({})),
	asc: vi.fn(() => ({})),
	desc: vi.fn(() => ({})),
	lt: vi.fn(() => ({})),
	inArray: vi.fn(() => ({})),
	sql: vi.fn(() => ({})),
	isNotNull: vi.fn(() => ({}))
}));

vi.mock('$lib/server/db/schema', () => ({
	match: {},
	matchParticipant: {},
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

vi.mock('./queue-math', async () => {
	const actual = await vi.importActual<typeof import('./queue-math')>('./queue-math');
	return { ...actual };
});

const { joinQueue } = await import('./queue');

function mockFindRecentActiveMatchRows(rows: Array<{ id: string }>) {
	const limit = vi.fn().mockResolvedValue(rows);
	const orderBy = vi.fn(() => ({ limit }));
	const where = vi.fn(() => ({ orderBy }));
	const innerJoinSecond = vi.fn(() => ({ where }));
	const innerJoinFirst = vi.fn(() => ({ innerJoin: innerJoinSecond }));
	const from = vi.fn(() => ({ innerJoin: innerJoinFirst }));

	mocks.db.select.mockReturnValue({ from });
}

describe('joinQueue', () => {
	beforeEach(() => {
		mocks.db.query.matchParticipantPlayer.findMany.mockReset();
		mocks.db.query.playerRating.findFirst.mockReset();
		mocks.db.query.matchQueue.findFirst.mockReset();
		mocks.db.select.mockReset();
		mocks.db.delete.mockReset();
	});

	test('throws when user is already in an active match', async () => {
		mocks.db.delete.mockReturnValue({
			where: vi.fn(() => ({ returning: vi.fn(() => Promise.resolve([])) }))
		});

		mockFindRecentActiveMatchRows([{ id: 'match-1' }]);

		await expect(joinQueue('user-1', 'team-1')).rejects.toThrow(
			'You are already in an active match'
		);
		expect(mocks.db.query.playerRating.findFirst).not.toHaveBeenCalled();
	});

	test('throws when user has no rating', async () => {
		mocks.db.delete.mockReturnValue({
			where: vi.fn(() => ({ returning: vi.fn(() => Promise.resolve([])) }))
		});

		mockFindRecentActiveMatchRows([]);
		mocks.db.query.playerRating.findFirst.mockResolvedValue(null);

		await expect(joinQueue('user-1', 'team-1')).rejects.toThrow(
			'No rating found — please re-register'
		);
	});

	test('throws when user is already in queue', async () => {
		mocks.db.delete.mockReturnValue({
			where: vi.fn(() => ({ returning: vi.fn(() => Promise.resolve([])) }))
		});

		mockFindRecentActiveMatchRows([]);
		mocks.db.query.playerRating.findFirst.mockResolvedValue({ elo: 1500 });
		mocks.db.query.matchQueue.findFirst.mockResolvedValue({ userId: 'user-1', teamId: 'team-1' });

		await expect(joinQueue('user-1', 'team-1')).rejects.toThrow('Already in queue');
	});
});
