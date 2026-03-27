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
import { user } from './auth.schema';

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
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
	verifiedAt: timestamp('verified_at', { withTimezone: true })
});

// ── Mappool Slots ───────────────────────────────────────────────────────
export const mappoolSlot = pgTable(
	'mappool_slot',
	{
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
	},
	(t) => [index('idx_mappool_slot_mappool').on(t.mappoolId)]
);

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
	(t) => [index('idx_match_state').on(t.state), index('idx_match_created_at').on(t.createdAt)]
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
		index('idx_mpp_participant').on(t.participantId),
		index('idx_mpp_user').on(t.userId)
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
	(t) => [uniqueIndex('idx_queue_user').on(t.userId), index('idx_queue_elo').on(t.elo)]
);

// ── Player ELO ──────────────────────────────────────────────────────────
export const playerRating = pgTable('player_rating', {
	id: uuid('id').primaryKey().defaultRandom(),
	userId: text('user_id').notNull().unique(),
	elo: integer('elo').default(1000).notNull(),
	wins: integer('wins').default(0).notNull(),
	losses: integer('losses').default(0).notNull(),
	initialElo: integer('initial_elo'),
	osuRankAtSeed: integer('osu_rank_at_seed'),
	updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

// ── Notifications ────────────────────────────────────────────────────
export const notification = pgTable(
	'notification',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		userId: text('user_id').notNull(),
		type: text('type').notNull(),
		title: text('title').notNull(),
		message: text('message'),
		referenceId: text('reference_id'),
		read: boolean('read').default(false).notNull(),
		actionedAt: timestamp('actioned_at', { withTimezone: true }),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
	},
	(t) => [
		index('idx_notification_user').on(t.userId),
		index('idx_notification_user_read').on(t.userId, t.read)
	]
);

// ── Match Invites ────────────────────────────────────────────────────
export const matchInvite = pgTable(
	'match_invite',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		createdBy: text('created_by').notNull(),
		creatorTeamId: uuid('creator_team_id')
			.notNull()
			.references(() => team.id),
		invitedTeamId: uuid('invited_team_id')
			.notNull()
			.references(() => team.id),
		config: jsonb('config').notNull(),
		mappoolId: uuid('mappool_id')
			.notNull()
			.references(() => mappool.id),
		name: text('name'),
		message: text('message'),
		scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
		expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
		status: text('status').default('pending').notNull(),
		matchId: uuid('match_id').references(() => match.id),
		respondedAt: timestamp('responded_at', { withTimezone: true }),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
	},
	(t) => [
		index('idx_invite_invited_team').on(t.invitedTeamId),
		index('idx_invite_created_by').on(t.createdBy),
		index('idx_invite_status').on(t.status)
	]
);

// ── Tournaments ────────────────────────────────────────────────────────
export const tournament = pgTable(
	'tournament',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		name: text('name').notNull(),
		description: text('description'),
		format: text('format').notNull(), // single_elim | double_elim | groups_bracket
		state: text('state').default('DRAFT').notNull(),
		config: jsonb('config').notNull(),
		maxSlots: integer('max_slots').notNull(),
		bannerUrl: text('banner_url'),
		createdBy: text('created_by').notNull(),
		registrationOpenAt: timestamp('registration_open_at', { withTimezone: true }),
		registrationCloseAt: timestamp('registration_close_at', { withTimezone: true }),
		startAt: timestamp('start_at', { withTimezone: true }),
		finishedAt: timestamp('finished_at', { withTimezone: true }),
		winnerId: uuid('winner_id').references(() => team.id),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
	},
	(t) => [
		index('idx_tournament_state').on(t.state),
		index('idx_tournament_created_at').on(t.createdAt)
	]
);

// ── Tournament Staff ───────────────────────────────────────────────────
export const tournamentStaff = pgTable(
	'tournament_staff',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		tournamentId: uuid('tournament_id')
			.notNull()
			.references(() => tournament.id, { onDelete: 'cascade' }),
		userId: text('user_id').notNull(),
		role: text('role').notNull() // organizer | admin | referee | pooler | streamer
	},
	(t) => [
		uniqueIndex('idx_tstaff_tournament_user').on(t.tournamentId, t.userId),
		index('idx_tstaff_tournament').on(t.tournamentId)
	]
);

// ── Tournament Rounds ──────────────────────────────────────────────────
export const tournamentRound = pgTable(
	'tournament_round',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		tournamentId: uuid('tournament_id')
			.notNull()
			.references(() => tournament.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		abbreviation: text('abbreviation'),
		roundOrder: integer('round_order').notNull(),
		bestOf: integer('best_of').notNull(),
		mappoolId: uuid('mappool_id').references(() => mappool.id),
		bracketType: text('bracket_type'), // winners | losers | grand_final | group | null
		scheduledAt: timestamp('scheduled_at', { withTimezone: true })
	},
	(t) => [index('idx_tround_tournament').on(t.tournamentId)]
);

// ── Tournament Registrations ───────────────────────────────────────────
export const tournamentRegistration = pgTable(
	'tournament_registration',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		tournamentId: uuid('tournament_id')
			.notNull()
			.references(() => tournament.id, { onDelete: 'cascade' }),
		teamId: uuid('team_id')
			.notNull()
			.references(() => team.id),
		userId: text('user_id').notNull(),
		seed: integer('seed'),
		qualifierScore: real('qualifier_score'),
		status: text('status').default('registered').notNull(),
		registeredAt: timestamp('registered_at', { withTimezone: true }).defaultNow().notNull()
	},
	(t) => [
		uniqueIndex('idx_treg_tournament_team').on(t.tournamentId, t.teamId),
		index('idx_treg_tournament').on(t.tournamentId)
	]
);

// ── Tournament Matches (bracket structure) ─────────────────────────────
export const tournamentMatch = pgTable(
	'tournament_match',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		tournamentId: uuid('tournament_id')
			.notNull()
			.references(() => tournament.id, { onDelete: 'cascade' }),
		roundId: uuid('round_id')
			.notNull()
			.references(() => tournamentRound.id, { onDelete: 'cascade' }),
		matchId: uuid('match_id').references(() => match.id),
		bracketPosition: integer('bracket_position').notNull(),
		winnerGoesToId: uuid('winner_goes_to_id'),
		loserGoesToId: uuid('loser_goes_to_id'),
		winnerSlot: integer('winner_slot'),
		loserSlot: integer('loser_slot'),
		team1Id: uuid('team1_id').references(() => team.id),
		team2Id: uuid('team2_id').references(() => team.id),
		winnerId: uuid('winner_id').references(() => team.id),
		scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
		state: text('state').default('PENDING').notNull()
	},
	(t) => [
		index('idx_tmatch_tournament').on(t.tournamentId),
		index('idx_tmatch_round').on(t.roundId),
		index('idx_tmatch_match').on(t.matchId),
		index('idx_tmatch_state').on(t.state)
	]
);

// ── Tournament Groups ──────────────────────────────────────────────────
export const tournamentGroup = pgTable(
	'tournament_group',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		tournamentId: uuid('tournament_id')
			.notNull()
			.references(() => tournament.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		groupOrder: integer('group_order').notNull()
	},
	(t) => [index('idx_tgroup_tournament').on(t.tournamentId)]
);

// ── Tournament Group Entries ───────────────────────────────────────────
export const tournamentGroupEntry = pgTable(
	'tournament_group_entry',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		groupId: uuid('group_id')
			.notNull()
			.references(() => tournamentGroup.id, { onDelete: 'cascade' }),
		teamId: uuid('team_id')
			.notNull()
			.references(() => team.id),
		wins: integer('wins').default(0).notNull(),
		losses: integer('losses').default(0).notNull(),
		mapWins: integer('map_wins').default(0).notNull(),
		mapLosses: integer('map_losses').default(0).notNull(),
		seed: integer('seed')
	},
	(t) => [
		uniqueIndex('idx_tge_group_team').on(t.groupId, t.teamId),
		index('idx_tge_group').on(t.groupId)
	]
);

// ── Tournament Qualifier Scores ────────────────────────────────────────
export const tournamentQualifierScore = pgTable(
	'tournament_qualifier_score',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		tournamentId: uuid('tournament_id')
			.notNull()
			.references(() => tournament.id, { onDelete: 'cascade' }),
		teamId: uuid('team_id')
			.notNull()
			.references(() => team.id),
		mappoolSlotId: uuid('mappool_slot_id')
			.notNull()
			.references(() => mappoolSlot.id),
		totalScore: integer('total_score').notNull(),
		accuracy: real('accuracy'),
		playedAt: timestamp('played_at', { withTimezone: true }).defaultNow().notNull()
	},
	(t) => [
		index('idx_tqs_tournament_team').on(t.tournamentId, t.teamId),
		index('idx_tqs_tournament').on(t.tournamentId)
	]
);

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

export const notificationRelations = relations(notification, ({}) => ({}));

export const matchInviteRelations = relations(matchInvite, ({ one }) => ({
	creatorTeam: one(team, {
		fields: [matchInvite.creatorTeamId],
		references: [team.id],
		relationName: 'inviteCreatorTeam'
	}),
	invitedTeam: one(team, {
		fields: [matchInvite.invitedTeamId],
		references: [team.id],
		relationName: 'inviteInvitedTeam'
	}),
	mappool: one(mappool, { fields: [matchInvite.mappoolId], references: [mappool.id] }),
	match: one(match, { fields: [matchInvite.matchId], references: [match.id] })
}));

// ── Tournament Relations ────────────────────────────────────────────────

export const tournamentRelations = relations(tournament, ({ many }) => ({
	rounds: many(tournamentRound),
	registrations: many(tournamentRegistration),
	matches: many(tournamentMatch),
	groups: many(tournamentGroup),
	staff: many(tournamentStaff),
	qualifierScores: many(tournamentQualifierScore)
}));

export const tournamentStaffRelations = relations(tournamentStaff, ({ one }) => ({
	tournament: one(tournament, {
		fields: [tournamentStaff.tournamentId],
		references: [tournament.id]
	})
}));

export const tournamentRoundRelations = relations(tournamentRound, ({ one, many }) => ({
	tournament: one(tournament, {
		fields: [tournamentRound.tournamentId],
		references: [tournament.id]
	}),
	mappool: one(mappool, { fields: [tournamentRound.mappoolId], references: [mappool.id] }),
	matches: many(tournamentMatch)
}));

export const tournamentRegistrationRelations = relations(tournamentRegistration, ({ one }) => ({
	tournament: one(tournament, {
		fields: [tournamentRegistration.tournamentId],
		references: [tournament.id]
	}),
	team: one(team, { fields: [tournamentRegistration.teamId], references: [team.id] })
}));

export const tournamentMatchRelations = relations(tournamentMatch, ({ one }) => ({
	tournament: one(tournament, {
		fields: [tournamentMatch.tournamentId],
		references: [tournament.id]
	}),
	round: one(tournamentRound, {
		fields: [tournamentMatch.roundId],
		references: [tournamentRound.id]
	}),
	match: one(match, { fields: [tournamentMatch.matchId], references: [match.id] }),
	team1: one(team, {
		fields: [tournamentMatch.team1Id],
		references: [team.id],
		relationName: 'tournamentMatchTeam1'
	}),
	team2: one(team, {
		fields: [tournamentMatch.team2Id],
		references: [team.id],
		relationName: 'tournamentMatchTeam2'
	}),
	winner: one(team, {
		fields: [tournamentMatch.winnerId],
		references: [team.id],
		relationName: 'tournamentMatchWinner'
	})
}));

export const tournamentGroupRelations = relations(tournamentGroup, ({ one, many }) => ({
	tournament: one(tournament, {
		fields: [tournamentGroup.tournamentId],
		references: [tournament.id]
	}),
	entries: many(tournamentGroupEntry)
}));

export const tournamentGroupEntryRelations = relations(tournamentGroupEntry, ({ one }) => ({
	group: one(tournamentGroup, {
		fields: [tournamentGroupEntry.groupId],
		references: [tournamentGroup.id]
	}),
	team: one(team, { fields: [tournamentGroupEntry.teamId], references: [team.id] })
}));

// ── Profile Comments ────────────────────────────────────────────────────
export const profileComment = pgTable(
	'profile_comment',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		// 'user' or 'team'
		targetType: text('target_type').notNull(),
		targetId: text('target_id').notNull(),
		authorId: text('author_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		content: text('content').notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
	},
	(t) => [
		index('idx_profile_comment_target').on(t.targetType, t.targetId),
		index('idx_profile_comment_author').on(t.authorId)
	]
);

export const profileCommentRelations = relations(profileComment, ({ one }) => ({
	author: one(user, { fields: [profileComment.authorId], references: [user.id] })
}));

export const tournamentQualifierScoreRelations = relations(tournamentQualifierScore, ({ one }) => ({
	tournament: one(tournament, {
		fields: [tournamentQualifierScore.tournamentId],
		references: [tournament.id]
	}),
	team: one(team, { fields: [tournamentQualifierScore.teamId], references: [team.id] }),
	slot: one(mappoolSlot, {
		fields: [tournamentQualifierScore.mappoolSlotId],
		references: [mappoolSlot.id]
	})
}));
