import { d as db, b as match, u as user, g as matchGame } from "./index2.js";
import { eq } from "drizzle-orm";
import { g as getMatchFull, M as MATCH_STATES, s as submitRoll, p as pickMap, d as submitGameScores } from "./engine.js";
import { b as private_env } from "./shared-server.js";
let client = null;
let connecting = null;
async function getClient() {
  if (client?.isConnected?.()) return client;
  if (connecting) {
    await connecting;
    return client;
  }
  if (!private_env.OSU_IRC_USERNAME || !private_env.OSU_IRC_PASSWORD) {
    throw new Error("OSU_IRC_USERNAME and OSU_IRC_PASSWORD must be set in .env");
  }
  const banchoModule = await import("bancho.js");
  const BanchoClient = banchoModule.BanchoClient ?? banchoModule.default?.BanchoClient ?? banchoModule.default;
  client = new BanchoClient({
    username: private_env.OSU_IRC_USERNAME,
    password: private_env.OSU_IRC_PASSWORD
  });
  connecting = client.connect().then(() => {
    console.log("[Bancho] Connected as", private_env.OSU_IRC_USERNAME);
    connecting = null;
  });
  await connecting;
  return client;
}
class TournamentLobby {
  channel = null;
  channelName = "";
  osuMatchId = 0;
  // Score collection
  collectedScores = [];
  matchFinishedResolve = null;
  // Ready tracking
  allReadyResolve = null;
  // Event callbacks (set by orchestrator)
  onRollResult = null;
  onPickCommand = null;
  /**
   * Create a new multiplayer lobby via !mp make.
   */
  async create(name) {
    const c = await getClient();
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error("Lobby creation timed out")),
        15e3
      );
      const banchoBot = c.getUser("BanchoBot");
      const onPM = (msg) => {
        const text = msg.message ?? String(msg);
        const m = text.match(/https:\/\/osu\.ppy\.sh\/mp\/(\d+)/);
        if (m) {
          clearTimeout(timeout);
          banchoBot.removeListener("message", onPM);
          this.osuMatchId = parseInt(m[1]);
          this.channelName = `#mp_${this.osuMatchId}`;
          this.joinChannel(c).then(
            () => resolve({ matchId: this.osuMatchId, channel: this.channelName })
          );
        }
      };
      banchoBot.on("message", onPM);
      banchoBot.sendMessage(`!mp make ${name}`);
    });
  }
  async joinChannel(c) {
    this.channel = c.getChannel(this.channelName);
    await this.channel.join();
    this.channel.on("message", (msg) => {
      const text = msg.message ?? String(msg);
      const sender = msg.user?.ircUsername ?? "";
      if (sender === "BanchoBot") {
        this.parseBanchoMessage(text);
      } else if (sender) {
        this.parsePlayerMessage(sender, text);
      }
    });
  }
  // ── Message Parsing ─────────────────────────────────────────────────
  parseBanchoMessage(text) {
    const scoreMatch = text.match(
      /^(.+?) finished playing \(Score: ([\d,]+).*?(PASSED|FAILED)\)/i
    );
    if (scoreMatch) {
      this.collectedScores.push({
        username: scoreMatch[1].trim(),
        score: parseInt(scoreMatch[2].replace(/,/g, "")),
        passed: scoreMatch[3] === "PASSED"
      });
      console.log(`[Bancho] Score: ${scoreMatch[1].trim()} = ${scoreMatch[2]}`);
      return;
    }
    if (text.includes("The match has finished!")) {
      console.log("[Bancho] Game finished. Scores:", this.collectedScores);
      if (this.matchFinishedResolve) {
        this.matchFinishedResolve([...this.collectedScores]);
        this.matchFinishedResolve = null;
      }
      this.collectedScores = [];
      return;
    }
    const rollMatch = text.match(/^(.+?) rolls (\d+) point\(s\)/);
    if (rollMatch) {
      const username = rollMatch[1].trim();
      const value = parseInt(rollMatch[2]);
      console.log(`[Bancho] Roll: ${username} = ${value}`);
      if (this.onRollResult) {
        this.onRollResult(username, value);
      }
      return;
    }
    if (text.includes("All players are ready")) {
      console.log("[Bancho] All players ready");
      if (this.allReadyResolve) {
        this.allReadyResolve();
        this.allReadyResolve = null;
      }
      return;
    }
  }
  parsePlayerMessage(sender, text) {
    const pickMatch = text.match(/^!pick\s+([A-Z]{2})(\d*)/i);
    if (pickMatch) {
      const category = pickMatch[1].toUpperCase();
      const num = pickMatch[2] ? parseInt(pickMatch[2]) : 1;
      const label = `${category}${num}`;
      console.log(`[Bancho] Pick command from ${sender}: ${label}`);
      if (this.onPickCommand) {
        this.onPickCommand(sender, label);
      }
      return;
    }
  }
  // ── IRC Commands ────────────────────────────────────────────────────
  async send(cmd) {
    if (!this.channel) throw new Error("Lobby not created");
    console.log(`[Bancho] ${this.channelName} > ${cmd}`);
    await this.channel.sendMessage(cmd);
  }
  async invite(username) {
    await this.send(`!mp invite ${username.replace(/ /g, "_")}`);
  }
  async setProperties(teamMode, scoreMode, size) {
    await this.send(`!mp set ${teamMode} ${scoreMode} ${size}`);
  }
  async setMap(beatmapId, playmode = 0) {
    await this.send(`!mp map ${beatmapId} ${playmode}`);
  }
  async setMods(mods) {
    const filtered = mods.filter((m) => !["NM", "TB", "None", "NF"].includes(m));
    if (mods.includes("FM") || mods.includes("Freemod")) {
      await this.send("!mp mods Freemod NF");
    } else if (filtered.length > 0) {
      await this.send(`!mp mods NF ${filtered.join(" ")}`);
    } else {
      await this.send("!mp mods NF");
    }
  }
  async startGame(delaySec = 5) {
    await this.send(`!mp start ${delaySec}`);
  }
  async close() {
    try {
      await this.send("!mp close");
    } catch {
    }
  }
  async chat(message) {
    await this.send(message);
  }
  // ── Async Waiters ───────────────────────────────────────────────────
  /**
   * Wait for all players to click "Ready" in osu! client.
   * BanchoBot sends "All players are ready" when they do.
   */
  waitForReady(timeoutMs = 18e4) {
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => {
        this.allReadyResolve = null;
        reject(new Error("Timed out waiting for players to ready"));
      }, timeoutMs);
      this.allReadyResolve = () => {
        clearTimeout(t);
        resolve();
      };
    });
  }
  /**
   * Wait for "The match has finished!" and return all player scores.
   */
  waitForScores(timeoutMs = 6e5) {
    this.collectedScores = [];
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => {
        this.matchFinishedResolve = null;
        reject(new Error("Timed out waiting for match scores"));
      }, timeoutMs);
      this.matchFinishedResolve = (scores) => {
        clearTimeout(t);
        resolve(scores);
      };
    });
  }
}
const lobbies = /* @__PURE__ */ new Map();
function getLobby(matchId) {
  return lobbies.get(matchId);
}
function setLobby(matchId, lobby) {
  lobbies.set(matchId, lobby);
}
function removeLobby(matchId) {
  lobbies.delete(matchId);
}
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
async function initMatchLobby(matchId) {
  const m = await getMatchFull(matchId);
  const config = m.config;
  const lobby = new TournamentLobby();
  const lobbyName = `VASH: (${m.participants[0]?.team.name}) vs (${m.participants[1]?.team.name})`;
  console.log(`[Orchestrator] Creating lobby: ${lobbyName}`);
  const { matchId: osuId, channel } = await lobby.create(lobbyName);
  console.log(`[Orchestrator] Created ${channel} (osu mp/${osuId})`);
  setLobby(matchId, lobby);
  await db.update(match).set({ state: MATCH_STATES.LOBBY, osuLobbyId: osuId, startedAt: /* @__PURE__ */ new Date() }).where(eq(match.id, matchId));
  const scoreMode = config.scoringType === "score_v2" ? 3 : config.scoringType === "accuracy" ? 1 : config.scoringType === "combo" ? 2 : 0;
  await lobby.setProperties(0, scoreMode, config.teamSize * 2);
  await lobby.send("!mp password");
  await sleep(500);
  const invited = /* @__PURE__ */ new Set();
  for (const p of m.participants) {
    for (const pl of p.players) {
      const u = await db.query.user.findFirst({ where: eq(user.id, pl.userId) });
      if (u?.name && !invited.has(u.name.toLowerCase())) {
        await lobby.invite(u.name);
        invited.add(u.name.toLowerCase());
        console.log(`[Orchestrator] Invited ${u.name}`);
        await sleep(300);
      }
    }
  }
  setupChatHandlers(matchId, lobby);
  await lobby.chat(
    `Welcome! BO${config.bestOf}. Type !roll to decide pick order, or use the web UI.`
  );
  await db.update(match).set({ state: MATCH_STATES.ROLLING }).where(eq(match.id, matchId));
  return { osuMatchId: osuId, channel };
}
function setupChatHandlers(matchId, lobby) {
  lobby.onRollResult = async (username, value) => {
    try {
      const m = await getMatchFull(matchId);
      if (m.state !== MATCH_STATES.ROLLING) {
        await lobby.chat(`Rolls are not active right now.`);
        return;
      }
      let targetParticipant = null;
      for (const p of m.participants) {
        for (const pl of p.players) {
          const u = await db.query.user.findFirst({ where: eq(user.id, pl.userId) });
          if (u?.name?.toLowerCase() === username.toLowerCase().replace(/_/g, " ")) {
            if (p.rollValue === null) {
              targetParticipant = p;
              break;
            } else if (!targetParticipant) {
              const unrolled = m.participants.find((pp) => pp.rollValue === null);
              if (unrolled) targetParticipant = unrolled;
            }
          }
        }
        if (targetParticipant?.rollValue === null) break;
      }
      if (!targetParticipant || targetParticipant.rollValue !== null) {
        await lobby.chat(`${username}: already rolled or not in this match.`);
        return;
      }
      await submitRoll(matchId, targetParticipant.id, value);
      console.log(`[Orchestrator] IRC roll: ${username} = ${value}`);
      const updated = await getMatchFull(matchId);
      if (updated.state === MATCH_STATES.PICKING) {
        const sorted = [...updated.participants].sort(
          (a, b) => (a.pickOrder ?? 99) - (b.pickOrder ?? 99)
        );
        await lobby.chat(
          `Rolls complete! ${sorted[0]?.team.name} picks first. Use !pick <slot> (e.g. !pick NM1) or pick in web UI.`
        );
      }
    } catch (err) {
      console.error("[Orchestrator] IRC roll error:", err.message);
    }
  };
  lobby.onPickCommand = async (username, slotLabel) => {
    try {
      const m = await getMatchFull(matchId);
      if (m.state !== MATCH_STATES.PICKING) {
        await lobby.chat(`Picks are not active right now.`);
        return;
      }
      const labelMatch = slotLabel.match(/^([A-Z]{2})(\d+)$/);
      if (!labelMatch) {
        await lobby.chat(`${username}: Invalid slot. Use format like NM1, HD2, DT1.`);
        return;
      }
      const category = labelMatch[1];
      const order = parseInt(labelMatch[2]);
      const sorted = [...m.participants].sort(
        (a, b) => (a.pickOrder ?? 99) - (b.pickOrder ?? 99)
      );
      const expectedIdx = m.games.length % sorted.length;
      const expectedPicker = sorted[expectedIdx];
      let isPickerTurn = false;
      if (expectedPicker) {
        for (const pl of expectedPicker.players) {
          const u = await db.query.user.findFirst({ where: eq(user.id, pl.userId) });
          if (u?.name?.toLowerCase() === username.toLowerCase().replace(/_/g, " ")) {
            isPickerTurn = true;
            break;
          }
        }
      }
      if (!isPickerTurn && m.participants[0]?.teamId === m.participants[1]?.teamId) {
        isPickerTurn = true;
      }
      if (!isPickerTurn) {
        await lobby.chat(`${username}: It's not your turn to pick.`);
        return;
      }
      const slot = m.mappool?.slots?.find(
        (s) => s.category === category && s.orderInCategory === order
      );
      if (!slot) {
        await lobby.chat(`${username}: Slot ${slotLabel} not found in this mappool.`);
        return;
      }
      const alreadyPlayed = m.games.some((g) => g.mappoolSlotId === slot.id);
      if (alreadyPlayed) {
        await lobby.chat(`${username}: ${slotLabel} has already been played.`);
        return;
      }
      const game = await pickMap(matchId, expectedPicker.id, slot.id);
      console.log(`[Orchestrator] IRC pick: ${username} picked ${slotLabel}`);
      playPickedMap(matchId, game.id).catch(
        (err) => console.error("[Orchestrator] IRC play failed:", err.message)
      );
    } catch (err) {
      console.error("[Orchestrator] IRC pick error:", err.message);
      await lobby.chat(`Error: ${err.message}`).catch(() => {
      });
    }
  };
}
async function playPickedMap(matchId, matchGameId) {
  const lobby = getLobby(matchId);
  if (!lobby) {
    console.warn("[Orchestrator] No IRC lobby for", matchId, "— skipping IRC");
    return;
  }
  const game = await db.query.matchGame.findFirst({
    where: eq(matchGame.id, matchGameId),
    with: { slot: true }
  });
  if (!game) throw new Error("Game not found");
  const slot = game.slot;
  await lobby.setMap(slot.beatmapId);
  await sleep(1e3);
  await lobby.setMods(slot.mods);
  await sleep(500);
  await lobby.chat(
    `Playing ${slot.category}${slot.orderInCategory}. Ready up! (Game starts when all players are ready)`
  );
  try {
    await lobby.waitForReady();
    await lobby.chat("All ready — starting in 5s!");
    await lobby.startGame(5);
  } catch (err) {
    console.warn("[Orchestrator] Ready timeout:", err.message);
    await lobby.chat("Ready timed out. Use the web UI to force start, or ready up!");
    return;
  }
  collectScores(matchId, matchGameId, lobby).catch(
    (err) => console.error("[Orchestrator] Score collection failed:", err)
  );
}
async function forceStartGame(matchId) {
  const lobby = getLobby(matchId);
  if (!lobby) return;
  await lobby.chat("Force starting in 10s!");
  await lobby.startGame(10);
}
async function collectScores(matchId, matchGameId, lobby) {
  const ircScores = await lobby.waitForScores();
  console.log(`[Orchestrator] Scores for game ${matchGameId}:`, ircScores);
  const m = await getMatchFull(matchId);
  const scores = [];
  for (const irc of ircScores) {
    for (const participant of m.participants) {
      for (const player of participant.players) {
        const u = await db.query.user.findFirst({ where: eq(user.id, player.userId) });
        const ircName = irc.username.toLowerCase().replace(/_/g, " ");
        const dbName = u?.name?.toLowerCase();
        if (dbName && (dbName === ircName || dbName === irc.username.toLowerCase())) {
          scores.push({ playerId: player.id, score: irc.score, passed: irc.passed });
        }
      }
    }
  }
  if (scores.length === 0) {
    console.warn("[Orchestrator] No scores matched any IRC usernames");
    return;
  }
  await submitGameScores(matchGameId, scores);
  const updated = await getMatchFull(matchId);
  if (updated.state === MATCH_STATES.FINISHED) {
    const winner = updated.participants.find((p) => p.teamId === updated.winnerId);
    await lobby.chat(`GG! ${winner?.team.name ?? "?"} wins the match!`);
    await sleep(5e3);
    await lobby.close();
    removeLobby(matchId);
  } else {
    const sorted = [...updated.participants].sort(
      (a, b) => (a.pickOrder ?? 99) - (b.pickOrder ?? 99)
    );
    const nextIdx = updated.games.length % sorted.length;
    const nextPicker = sorted[nextIdx];
    await lobby.chat(
      `${nextPicker?.team.name}'s turn to pick. Use !pick <slot> (e.g. !pick HD1) or pick in web UI.`
    );
  }
}
async function closeLobby(matchId) {
  const lobby = getLobby(matchId);
  if (lobby) {
    await lobby.close();
    removeLobby(matchId);
  }
}
export {
  closeLobby as c,
  forceStartGame as f,
  getLobby as g,
  initMatchLobby as i,
  playPickedMap as p
};
