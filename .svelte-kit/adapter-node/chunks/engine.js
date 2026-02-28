import { d as db, b as match, e as matchParticipant, t as teamMember, f as matchParticipantPlayer, g as matchGame, h as matchGameScore, i as matchQueue, p as playerRating } from "./index2.js";
import { eq, sql, asc } from "drizzle-orm";
const MATCH_STATES = {
  CREATED: "CREATED",
  LOBBY: "LOBBY",
  ROLLING: "ROLLING",
  PICKING: "PICKING",
  PLAYING: "PLAYING",
  FINISHED: "FINISHED",
  CANCELLED: "CANCELLED"
};
const GAME_STATES = {
  PLAYING: "PLAYING",
  FINISHED: "FINISHED"
};
async function joinQueue(userId, teamId) {
  let rating = await db.query.playerRating.findFirst({
    where: eq(playerRating.userId, userId)
  });
  if (!rating) {
    [rating] = await db.insert(playerRating).values({ userId, elo: 1e3 }).returning();
  }
  const existing = await db.query.matchQueue.findFirst({
    where: eq(matchQueue.userId, userId)
  });
  if (existing) throw new Error("Already in queue");
  await db.insert(matchQueue).values({
    userId,
    teamId,
    elo: rating.elo
  });
  return tryMatchFromQueue();
}
async function leaveQueue(userId) {
  await db.delete(matchQueue).where(eq(matchQueue.userId, userId));
}
async function getQueueStatus(userId) {
  const entry = await db.query.matchQueue.findFirst({
    where: eq(matchQueue.userId, userId)
  });
  const count = await db.select({ count: sql`count(*)` }).from(matchQueue);
  return {
    inQueue: !!entry,
    queueSize: Number(count[0].count),
    joinedAt: entry?.joinedAt ?? null
  };
}
async function tryMatchFromQueue() {
  const queue = await db.query.matchQueue.findMany({
    orderBy: asc(matchQueue.elo)
  });
  if (queue.length < 2) return null;
  let bestPair = null;
  let smallestGap = Infinity;
  for (let i = 0; i < queue.length - 1; i++) {
    const gap = Math.abs(queue[i].elo - queue[i + 1].elo);
    if (gap < smallestGap) {
      smallestGap = gap;
      bestPair = [queue[i], queue[i + 1]];
    }
  }
  if (!bestPair) return null;
  const avgElo = (bestPair[0].elo + bestPair[1].elo) / 2;
  const selectedPool = await selectMappoolForRating(avgElo);
  if (!selectedPool) throw new Error("No mappools available");
  await db.delete(matchQueue).where(eq(matchQueue.userId, bestPair[0].userId));
  await db.delete(matchQueue).where(eq(matchQueue.userId, bestPair[1].userId));
  const created = await createMatch({
    name: "Ranked Match",
    config: { bestOf: 7, teamSize: 1, scoringType: "score" },
    mappoolId: selectedPool.id,
    teams: [bestPair[0].teamId, bestPair[1].teamId],
    createdBy: "system"
  });
  return created;
}
async function selectMappoolForRating(avgElo) {
  const pools = await db.query.mappool.findMany({
    with: { slots: true }
  });
  if (pools.length === 0) return null;
  const targetStars = 3 + (avgElo - 800) / 400 * 4;
  const clampedTarget = Math.max(2, Math.min(8, targetStars));
  let bestPool = pools[0];
  let bestDiff = Infinity;
  for (const pool of pools) {
    if (pool.slots.length === 0) continue;
    const avgStars = pool.slots.reduce((sum, s) => sum + (s.starRating ?? 0), 0) / pool.slots.length;
    const diff = Math.abs(avgStars - clampedTarget);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestPool = pool;
    }
  }
  return bestPool;
}
async function createMatch(opts) {
  const { name, config, mappoolId, teams, createdBy } = opts;
  const [created] = await db.insert(match).values({
    name,
    config,
    mappoolId,
    createdBy,
    state: MATCH_STATES.CREATED
  }).returning();
  for (let i = 0; i < teams.length; i++) {
    const [participant] = await db.insert(matchParticipant).values({
      matchId: created.id,
      teamId: teams[i],
      slot: i + 1
    }).returning();
    const members = await db.query.teamMember.findMany({
      where: eq(teamMember.teamId, teams[i])
    });
    for (const member of members) {
      await db.insert(matchParticipantPlayer).values({
        participantId: participant.id,
        userId: member.userId
      });
    }
  }
  return getMatchFull(created.id);
}
async function moveToLobby(matchId, osuLobbyId) {
  const m = await getMatchOrThrow(matchId);
  assertState(m.state, MATCH_STATES.CREATED);
  await db.update(match).set({
    state: MATCH_STATES.LOBBY,
    osuLobbyId: osuLobbyId ?? null,
    startedAt: /* @__PURE__ */ new Date()
  }).where(eq(match.id, matchId));
  return getMatchFull(matchId);
}
async function moveToRolling(matchId) {
  const m = await getMatchOrThrow(matchId);
  assertState(m.state, MATCH_STATES.LOBBY);
  await db.update(match).set({ state: MATCH_STATES.ROLLING }).where(eq(match.id, matchId));
  return getMatchFull(matchId);
}
async function submitRoll(matchId, participantId, value) {
  const m = await getMatchOrThrow(matchId);
  assertState(m.state, MATCH_STATES.ROLLING);
  await db.update(matchParticipant).set({ rollValue: value }).where(eq(matchParticipant.id, participantId));
  const participants = await db.query.matchParticipant.findMany({
    where: eq(matchParticipant.matchId, matchId)
  });
  const allRolled = participants.every(
    (p) => p.id === participantId ? true : p.rollValue !== null
  );
  if (allRolled) {
    const sorted = [...participants].map((p) => ({
      ...p,
      rollValue: p.id === participantId ? value : p.rollValue
    })).sort((a, b) => b.rollValue - a.rollValue);
    for (let i = 0; i < sorted.length; i++) {
      await db.update(matchParticipant).set({ pickOrder: i + 1 }).where(eq(matchParticipant.id, sorted[i].id));
    }
    await db.update(match).set({ state: MATCH_STATES.PICKING }).where(eq(match.id, matchId));
  }
  return getMatchFull(matchId);
}
async function pickMap(matchId, participantId, mappoolSlotId) {
  const m = await getMatchOrThrow(matchId);
  assertState(m.state, MATCH_STATES.PICKING);
  const participants = await db.query.matchParticipant.findMany({
    where: eq(matchParticipant.matchId, matchId)
  });
  const totalGames = await db.query.matchGame.findMany({
    where: eq(matchGame.matchId, matchId)
  });
  const expectedPicker = getExpectedPicker(participants, totalGames.length);
  if (expectedPicker.id !== participantId) {
    throw new Error("Not your turn to pick");
  }
  const alreadyPlayed = totalGames.some((g) => g.mappoolSlotId === mappoolSlotId);
  if (alreadyPlayed) {
    throw new Error("This map has already been played");
  }
  const [game] = await db.insert(matchGame).values({
    matchId,
    gameNumber: totalGames.length + 1,
    mappoolSlotId,
    pickedByParticipantId: participantId,
    state: GAME_STATES.PLAYING,
    startedAt: /* @__PURE__ */ new Date()
  }).returning();
  await db.update(match).set({ state: MATCH_STATES.PLAYING }).where(eq(match.id, matchId));
  return game;
}
async function submitGameScores(matchGameId, scores) {
  const game = await db.query.matchGame.findFirst({
    where: eq(matchGame.id, matchGameId)
  });
  if (!game) throw new Error("Game not found");
  if (game.state !== GAME_STATES.PLAYING) throw new Error(`Game is ${game.state}, not PLAYING`);
  for (const s of scores) {
    await db.insert(matchGameScore).values({
      matchGameId,
      playerId: s.playerId,
      score: s.score,
      accuracy: s.accuracy ?? 0,
      maxCombo: s.maxCombo ?? 0,
      count300: s.count300 ?? 0,
      count100: s.count100 ?? 0,
      count50: s.count50 ?? 0,
      countMiss: s.countMiss ?? 0,
      mods: s.mods ?? [],
      passed: s.passed ?? true
    });
  }
  const allScores = await db.query.matchGameScore.findMany({
    where: eq(matchGameScore.matchGameId, matchGameId),
    with: { player: true }
  });
  const participantScores = /* @__PURE__ */ new Map();
  for (const s of allScores) {
    const pid = s.player.participantId;
    participantScores.set(pid, (participantScores.get(pid) ?? 0) + s.score);
  }
  let winnerId = null;
  let highScore = -1;
  for (const [pid, total] of participantScores) {
    if (total > highScore) {
      highScore = total;
      winnerId = pid;
    }
  }
  await db.update(matchGame).set({
    state: GAME_STATES.FINISHED,
    winnerParticipantId: winnerId,
    finishedAt: /* @__PURE__ */ new Date()
  }).where(eq(matchGame.id, matchGameId));
  if (winnerId) {
    const participant = await db.query.matchParticipant.findFirst({
      where: eq(matchParticipant.id, winnerId)
    });
    if (participant) {
      await db.update(matchParticipant).set({ score: participant.score + 1 }).where(eq(matchParticipant.id, winnerId));
    }
  }
  const m = await getMatchOrThrow(game.matchId);
  const config = m.config;
  const winsNeeded = Math.ceil(config.bestOf / 2);
  const participants = await db.query.matchParticipant.findMany({
    where: eq(matchParticipant.matchId, game.matchId)
  });
  const matchWinner = participants.find((p) => p.score >= winsNeeded);
  if (matchWinner) {
    await db.update(match).set({
      state: MATCH_STATES.FINISHED,
      winnerId: matchWinner.teamId,
      finishedAt: /* @__PURE__ */ new Date()
    }).where(eq(match.id, game.matchId));
    await updateElo(participants, matchWinner.id);
  } else {
    await db.update(match).set({ state: MATCH_STATES.PICKING }).where(eq(match.id, game.matchId));
  }
  return getMatchFull(game.matchId);
}
async function updateElo(participants, winnerId) {
  for (const p of participants) {
    const players = await db.query.matchParticipantPlayer.findMany({
      where: eq(matchParticipantPlayer.participantId, p.id)
    });
    const isWinner = p.id === winnerId;
    for (const player of players) {
      let rating = await db.query.playerRating.findFirst({
        where: eq(playerRating.userId, player.userId)
      });
      if (!rating) {
        [rating] = await db.insert(playerRating).values({ userId: player.userId, elo: 1e3 }).returning();
      }
      const K = 32;
      const expected = 0.5;
      const actual = isWinner ? 1 : 0;
      const newElo = Math.round(rating.elo + K * (actual - expected));
      await db.update(playerRating).set({
        elo: newElo,
        wins: isWinner ? rating.wins + 1 : rating.wins,
        losses: isWinner ? rating.losses : rating.losses + 1,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq(playerRating.userId, player.userId));
    }
  }
}
async function cancelMatch(matchId) {
  await db.update(match).set({
    state: MATCH_STATES.CANCELLED,
    finishedAt: /* @__PURE__ */ new Date()
  }).where(eq(match.id, matchId));
  return getMatchFull(matchId);
}
function getExpectedPicker(participants, gameCount) {
  const sorted = [...participants].sort((a, b) => (a.pickOrder ?? 99) - (b.pickOrder ?? 99));
  const pickerIndex = gameCount % sorted.length;
  return sorted[pickerIndex];
}
async function getMatchFull(matchId) {
  const m = await db.query.match.findFirst({
    where: eq(match.id, matchId),
    with: {
      mappool: {
        with: { slots: true }
      },
      participants: {
        with: {
          team: true,
          players: true
        }
      },
      games: {
        with: {
          slot: true,
          scores: {
            with: { player: true }
          }
        },
        orderBy: (g, { asc: asc2 }) => [asc2(g.gameNumber)]
      }
    }
  });
  if (!m) throw new Error("Match not found");
  return m;
}
async function getMatchOrThrow(matchId) {
  const m = await db.query.match.findFirst({
    where: eq(match.id, matchId)
  });
  if (!m) throw new Error("Match not found");
  return m;
}
function assertState(current, expected) {
  if (current !== expected) {
    throw new Error(`Match is ${current}, expected ${expected}`);
  }
}
export {
  MATCH_STATES as M,
  cancelMatch as a,
  moveToRolling as b,
  createMatch as c,
  submitGameScores as d,
  getQueueStatus as e,
  getMatchFull as g,
  joinQueue as j,
  leaveQueue as l,
  moveToLobby as m,
  pickMap as p,
  submitRoll as s
};
