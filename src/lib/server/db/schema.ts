import {
	pgTable,
	integer,
	text,
	uuid,
	boolean,
	timestamp,
	jsonb,
	index,
	uniqueIndex,
	real
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export * from './auth.schema';

// ── Teams ───────────────────────────────────────────────────────────────
export const team = pgTable('team', {
	id: uuid('id').primaryKey().defaultRandom(),
	name: text('name').notNull(),
	isPersonal: boolean('is_personal').default(false).notNull(),
	ownerId: text('owner_id'),
	avatarUrl: text('avatar_url'),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

// ── Team Members ────────────────────────────────────────────────────────
export const teamMember = pgTable('team_member', {
	id: uuid('id').primaryKey().defaultRandom(),
	teamId: uuid('team_id')
		.notNull()
		.references(() => team.id, { onDelete: 'cascade' }),
	userId: text('user_id').notNull(),
	role: text('role').default('member'),
	joinedAt: timestamp('joined_at', { withTimezone: true }).defaultNow()
});

// ── Mappools ────────────────────────────────────────────────────────────
export const mappool = pgTable('mappool', {
	id: uuid('id').primaryKey().defaultRandom(),
	name: text('name').notNull(),
	createdBy: text('created_by'),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

// ── Mappool Slots ───────────────────────────────────────────────────────
export const mappoolSlot = pgTable('mappool_slot', {
	id: uuid('id').primaryKey().defaultRandom(),
	mappoolId: uuid('mappool_id')
		.notNull()
		.references(() => mappool.id, { onDelete: 'cascade' }),
	category: text('category').notNull(),
	orderInCategory: integer('order_in_category').notNull(),
	beatmapId: text('beatmap_id').notNull(),
	starRating: real('star_rating'),
	bpm: real('bpm'),
	totalLength: integer('total_length'),
	mods: text('mods').array().default([]).notNull(),
	// ── Cached beatmap metadata (stored at insert time → zero API calls on page load) ──
	title: text('title'),
	artist: text('artist'),
	version: text('version'),
	coverUrl: text('cover_url'),
	listCoverUrl: text('list_cover_url')
});

// ── Matches ─────────────────────────────────────────────────────────────
export const match = pgTable(
	'match',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		name: text('name'),
		state: text('state').default('CREATED').notNull(),
		config: jsonb('config').notNull(),
		mappoolId: uuid('mappool_id').references(() => mappool.id),
		osuLobbyId: integer('osu_lobby_id'),
		scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
		startedAt: timestamp('started_at', { withTimezone: true }),
		finishedAt: timestamp('finished_at', { withTimezone: true }),
		winnerId: uuid('winner_id').references(() => team.id),
		createdBy: text('created_by'),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
	},
	(t) => [index('idx_match_state').on(t.state)]
);

// ── Match Participants (a team in a match) ──────────────────────────────
export const matchParticipant = pgTable(
	'match_participant',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		matchId: uuid('match_id')
			.notNull()
			.references(() => match.id, { onDelete: 'cascade' }),
		teamId: uuid('team_id')
			.notNull()
			.references(() => team.id),
		slot: integer('slot').notNull(),
		score: integer('score').default(0).notNull(),
		rollValue: integer('roll_value'),
		pickOrder: integer('pick_order')
	},
	(t) => [
		index('idx_mp_match_team').on(t.matchId, t.teamId),
		uniqueIndex('idx_mp_match_slot').on(t.matchId, t.slot),
		index('idx_mp_match').on(t.matchId)
	]
);

// ── Match Participant Players (a player fielded for this match) ─────────
export const matchParticipantPlayer = pgTable(
	'match_participant_player',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		participantId: uuid('participant_id')
			.notNull()
			.references(() => matchParticipant.id, { onDelete: 'cascade' }),
		userId: text('user_id').notNull()
	},
	(t) => [
		uniqueIndex('idx_mpp_participant_user').on(t.participantId, t.userId),
		index('idx_mpp_participant').on(t.participantId)
	]
);

// ── Match Games ─────────────────────────────────────────────────────────
export const matchGame = pgTable(
	'match_game',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		matchId: uuid('match_id')
			.notNull()
			.references(() => match.id, { onDelete: 'cascade' }),
		gameNumber: integer('game_number').notNull(),
		mappoolSlotId: uuid('mappool_slot_id')
			.notNull()
			.references(() => mappoolSlot.id),
		pickedByParticipantId: uuid('picked_by_participant_id').references(() => matchParticipant.id),
		winnerParticipantId: uuid('winner_participant_id').references(() => matchParticipant.id),
		state: text('state').default('PENDING').notNull(),
		startedAt: timestamp('started_at', { withTimezone: true }),
		finishedAt: timestamp('finished_at', { withTimezone: true })
	},
	(t) => [index('idx_match_game_match').on(t.matchId)]
);

// ── Match Game Scores (per-player per-map) ──────────────────────────────
export const matchGameScore = pgTable(
	'match_game_score',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		matchGameId: uuid('match_game_id')
			.notNull()
			.references(() => matchGame.id, { onDelete: 'cascade' }),
		playerId: uuid('player_id')
			.notNull()
			.references(() => matchParticipantPlayer.id),
		score: integer('score').default(0).notNull(),
		accuracy: real('accuracy').default(0).notNull(),
		maxCombo: integer('max_combo').default(0).notNull(),
		count300: integer('count_300').default(0).notNull(),
		count100: integer('count_100').default(0).notNull(),
		count50: integer('count_50').default(0).notNull(),
		countMiss: integer('count_miss').default(0).notNull(),
		mods: text('mods').array().default([]).notNull(),
		passed: boolean('passed').default(false).notNull(),
		pp: real('pp')
	},
	(t) => [index('idx_mgs_game').on(t.matchGameId)]
);

// ── Match Queue ─────────────────────────────────────────────────────────
export const matchQueue = pgTable(
	'match_queue',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		userId: text('user_id').notNull(),
		teamId: uuid('team_id')
			.notNull()
			.references(() => team.id),
		elo: integer('elo').default(1000).notNull(),
		joinedAt: timestamp('joined_at', { withTimezone: true }).defaultNow().notNull()
	},
	(t) => [
		uniqueIndex('idx_queue_user').on(t.userId),
		index('idx_queue_elo').on(t.elo)
	]
);

// ── Player ELO ──────────────────────────────────────────────────────────
export const playerRating = pgTable('player_rating', {
	id: uuid('id').primaryKey().defaultRandom(),
	userId: text('user_id').notNull().unique(),
	elo: integer('elo').default(1000).notNull(),
	wins: integer('wins').default(0).notNull(),
	losses: integer('losses').default(0).notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

// ── Relations ───────────────────────────────────────────────────────────

export const teamRelations = relations(team, ({ many }) => ({
	members: many(teamMember)
}));

export const teamMemberRelations = relations(teamMember, ({ one }) => ({
	team: one(team, { fields: [teamMember.teamId], references: [team.id] })
}));

export const mappoolRelations = relations(mappool, ({ many }) => ({
	slots: many(mappoolSlot)
}));

export const mappoolSlotRelations = relations(mappoolSlot, ({ one }) => ({
	mappool: one(mappool, { fields: [mappoolSlot.mappoolId], references: [mappool.id] })
}));

export const matchRelations = relations(match, ({ one, many }) => ({
	mappool: one(mappool, { fields: [match.mappoolId], references: [mappool.id] }),
	participants: many(matchParticipant),
	games: many(matchGame)
}));

export const matchParticipantRelations = relations(matchParticipant, ({ one, many }) => ({
	match: one(match, { fields: [matchParticipant.matchId], references: [match.id] }),
	team: one(team, { fields: [matchParticipant.teamId], references: [team.id] }),
	players: many(matchParticipantPlayer)
}));

export const matchParticipantPlayerRelations = relations(matchParticipantPlayer, ({ one }) => ({
	participant: one(matchParticipant, {
		fields: [matchParticipantPlayer.participantId],
		references: [matchParticipant.id]
	})
}));

export const matchGameRelations = relations(matchGame, ({ one, many }) => ({
	match: one(match, { fields: [matchGame.matchId], references: [match.id] }),
	slot: one(mappoolSlot, { fields: [matchGame.mappoolSlotId], references: [mappoolSlot.id] }),
	scores: many(matchGameScore)
}));

export const matchGameScoreRelations = relations(matchGameScore, ({ one }) => ({
	game: one(matchGame, { fields: [matchGameScore.matchGameId], references: [matchGame.id] }),
	player: one(matchParticipantPlayer, {
		fields: [matchGameScore.playerId],
		references: [matchParticipantPlayer.id]
	})
}));

export const matchQueueRelations = relations(matchQueue, ({ one }) => ({
	team: one(team, { fields: [matchQueue.teamId], references: [team.id] })
}));
