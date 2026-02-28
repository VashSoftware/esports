import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { pgTable, timestamp, text, boolean, index, uuid, real, integer, jsonb, uniqueIndex } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { b as private_env } from "./shared-server.js";
const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  // ── Staff role: 'player' | 'referee' | 'admin' ──
  role: text("role").default("player").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => /* @__PURE__ */ new Date()).notNull()
});
const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").$onUpdate(() => /* @__PURE__ */ new Date()).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" })
  },
  (table) => [index("session_userId_idx").on(table.userId)]
);
const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").$onUpdate(() => /* @__PURE__ */ new Date()).notNull()
  },
  (table) => [index("account_userId_idx").on(table.userId)]
);
const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => /* @__PURE__ */ new Date()).notNull()
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)]
);
const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account)
}));
const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id]
  })
}));
const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id]
  })
}));
const team = pgTable("team", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  isPersonal: boolean("is_personal").default(false).notNull(),
  ownerId: text("owner_id"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});
const teamMember = pgTable("team_member", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id").notNull().references(() => team.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  role: text("role").default("member"),
  joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow()
});
const mappool = pgTable("mappool", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});
const mappoolSlot = pgTable("mappool_slot", {
  id: uuid("id").primaryKey().defaultRandom(),
  mappoolId: uuid("mappool_id").notNull().references(() => mappool.id, { onDelete: "cascade" }),
  category: text("category").notNull(),
  orderInCategory: integer("order_in_category").notNull(),
  beatmapId: text("beatmap_id").notNull(),
  starRating: real("star_rating"),
  mods: text("mods").array().default([]).notNull()
});
const match = pgTable(
  "match",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name"),
    state: text("state").default("CREATED").notNull(),
    config: jsonb("config").notNull(),
    mappoolId: uuid("mappool_id").references(() => mappool.id),
    osuLobbyId: integer("osu_lobby_id"),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    winnerId: uuid("winner_id").references(() => team.id),
    createdBy: text("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (t) => [index("idx_match_state").on(t.state)]
);
const matchParticipant = pgTable(
  "match_participant",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    matchId: uuid("match_id").notNull().references(() => match.id, { onDelete: "cascade" }),
    teamId: uuid("team_id").notNull().references(() => team.id),
    slot: integer("slot").notNull(),
    score: integer("score").default(0).notNull(),
    rollValue: integer("roll_value"),
    pickOrder: integer("pick_order")
  },
  (t) => [
    index("idx_mp_match_team").on(t.matchId, t.teamId),
    uniqueIndex("idx_mp_match_slot").on(t.matchId, t.slot),
    index("idx_mp_match").on(t.matchId)
  ]
);
const matchParticipantPlayer = pgTable(
  "match_participant_player",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    participantId: uuid("participant_id").notNull().references(() => matchParticipant.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull()
  },
  (t) => [
    uniqueIndex("idx_mpp_participant_user").on(t.participantId, t.userId),
    index("idx_mpp_participant").on(t.participantId)
  ]
);
const matchGame = pgTable(
  "match_game",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    matchId: uuid("match_id").notNull().references(() => match.id, { onDelete: "cascade" }),
    gameNumber: integer("game_number").notNull(),
    mappoolSlotId: uuid("mappool_slot_id").notNull().references(() => mappoolSlot.id),
    pickedByParticipantId: uuid("picked_by_participant_id").references(() => matchParticipant.id),
    winnerParticipantId: uuid("winner_participant_id").references(() => matchParticipant.id),
    state: text("state").default("PENDING").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true })
  },
  (t) => [index("idx_match_game_match").on(t.matchId)]
);
const matchGameScore = pgTable(
  "match_game_score",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    matchGameId: uuid("match_game_id").notNull().references(() => matchGame.id, { onDelete: "cascade" }),
    playerId: uuid("player_id").notNull().references(() => matchParticipantPlayer.id),
    score: integer("score").default(0).notNull(),
    accuracy: real("accuracy").default(0).notNull(),
    maxCombo: integer("max_combo").default(0).notNull(),
    count300: integer("count_300").default(0).notNull(),
    count100: integer("count_100").default(0).notNull(),
    count50: integer("count_50").default(0).notNull(),
    countMiss: integer("count_miss").default(0).notNull(),
    mods: text("mods").array().default([]).notNull(),
    passed: boolean("passed").default(false).notNull()
  },
  (t) => [index("idx_mgs_game").on(t.matchGameId)]
);
const matchQueue = pgTable(
  "match_queue",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    teamId: uuid("team_id").notNull().references(() => team.id),
    elo: integer("elo").default(1e3).notNull(),
    joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull()
  },
  (t) => [
    uniqueIndex("idx_queue_user").on(t.userId),
    index("idx_queue_elo").on(t.elo)
  ]
);
const playerRating = pgTable("player_rating", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().unique(),
  elo: integer("elo").default(1e3).notNull(),
  wins: integer("wins").default(0).notNull(),
  losses: integer("losses").default(0).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});
const teamRelations = relations(team, ({ many }) => ({
  members: many(teamMember)
}));
const teamMemberRelations = relations(teamMember, ({ one }) => ({
  team: one(team, { fields: [teamMember.teamId], references: [team.id] })
}));
const mappoolRelations = relations(mappool, ({ many }) => ({
  slots: many(mappoolSlot)
}));
const mappoolSlotRelations = relations(mappoolSlot, ({ one }) => ({
  mappool: one(mappool, { fields: [mappoolSlot.mappoolId], references: [mappool.id] })
}));
const matchRelations = relations(match, ({ one, many }) => ({
  mappool: one(mappool, { fields: [match.mappoolId], references: [mappool.id] }),
  participants: many(matchParticipant),
  games: many(matchGame)
}));
const matchParticipantRelations = relations(matchParticipant, ({ one, many }) => ({
  match: one(match, { fields: [matchParticipant.matchId], references: [match.id] }),
  team: one(team, { fields: [matchParticipant.teamId], references: [team.id] }),
  players: many(matchParticipantPlayer)
}));
const matchParticipantPlayerRelations = relations(matchParticipantPlayer, ({ one }) => ({
  participant: one(matchParticipant, {
    fields: [matchParticipantPlayer.participantId],
    references: [matchParticipant.id]
  })
}));
const matchGameRelations = relations(matchGame, ({ one, many }) => ({
  match: one(match, { fields: [matchGame.matchId], references: [match.id] }),
  slot: one(mappoolSlot, { fields: [matchGame.mappoolSlotId], references: [mappoolSlot.id] }),
  scores: many(matchGameScore)
}));
const matchGameScoreRelations = relations(matchGameScore, ({ one }) => ({
  game: one(matchGame, { fields: [matchGameScore.matchGameId], references: [matchGame.id] }),
  player: one(matchParticipantPlayer, {
    fields: [matchGameScore.playerId],
    references: [matchParticipantPlayer.id]
  })
}));
const matchQueueRelations = relations(matchQueue, ({ one }) => ({
  team: one(team, { fields: [matchQueue.teamId], references: [team.id] })
}));
const schema = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  account,
  accountRelations,
  mappool,
  mappoolRelations,
  mappoolSlot,
  mappoolSlotRelations,
  match,
  matchGame,
  matchGameRelations,
  matchGameScore,
  matchGameScoreRelations,
  matchParticipant,
  matchParticipantPlayer,
  matchParticipantPlayerRelations,
  matchParticipantRelations,
  matchQueue,
  matchQueueRelations,
  matchRelations,
  playerRating,
  session,
  sessionRelations,
  team,
  teamMember,
  teamMemberRelations,
  teamRelations,
  user,
  userRelations,
  verification
}, Symbol.toStringTag, { value: "Module" }));
if (!private_env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
const client = postgres(private_env.DATABASE_URL);
const db = drizzle(client, { schema });
export {
  mappoolSlot as a,
  match as b,
  team as c,
  db as d,
  matchParticipant as e,
  matchParticipantPlayer as f,
  matchGame as g,
  matchGameScore as h,
  matchQueue as i,
  account as j,
  mappool as m,
  playerRating as p,
  teamMember as t,
  user as u
};
