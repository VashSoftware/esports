import { d as db, e as eq, u as user } from './index2-B7hVh_Qf.js';
import { a as cancelMatch, g as getMatchFull, p as pickMap, s as submitRoll } from './engine-DiCmv1C-.js';
import { c as closeLobby, f as forceStartGame, p as playPickedMap, g as getLobby } from './orchestrator-BMt7lT0G.js';
import { r as redirect, e as error } from './index-B2LGyy1l.js';
import { g as getBeatmap } from './api-DYV1cRWY.js';
import 'postgres';
import './shared-server-DaWdgxVh.js';

const load = async ({ params, locals }) => {
  if (!locals.user) redirect(302, "/");
  let m;
  try {
    m = await getMatchFull(params.id);
  } catch {
    error(404, "Match not found");
  }
  const beatmapCache = {};
  if (m.mappool?.slots) {
    await Promise.allSettled(
      m.mappool.slots.map(async (slot) => {
        try {
          const bm = await getBeatmap(slot.beatmapId);
          beatmapCache[slot.beatmapId] = {
            title: bm.beatmapset.title,
            artist: bm.beatmapset.artist,
            version: bm.version,
            starRating: bm.difficulty_rating,
            bpm: bm.bpm,
            totalLength: bm.total_length,
            coverUrl: bm.beatmapset.covers["card@2x"],
            listCoverUrl: bm.beatmapset.covers["list@2x"]
          };
        } catch {
        }
      })
    );
  }
  return { match: m, beatmapCache, userId: locals.user.id };
};
const actions = {
  reinvite: async ({ params, locals }) => {
    if (!locals.user) redirect(302, "/");
    const lobby = getLobby(params.id);
    if (!lobby) return { error: "No active IRC lobby for this match" };
    const m = await getMatchFull(params.id);
    const invited = [];
    for (const p of m.participants) {
      for (const pl of p.players) {
        const u = await db.query.user.findFirst({ where: eq(user.id, pl.userId) });
        if (u?.name) {
          await lobby.invite(u.name);
          invited.push(u.name);
        }
      }
    }
    return { reinvited: invited };
  },
  roll: async ({ params, locals }) => {
    if (!locals.user) redirect(302, "/");
    const m = await getMatchFull(params.id);
    let myParticipant = m.participants.find(
      (p) => p.players.some((pl) => pl.userId === locals.user.id)
    );
    if (!myParticipant) {
      return { error: "You are not in this match" };
    }
    if (myParticipant.rollValue !== null) {
      const unrolled = m.participants.find((p) => p.rollValue === null);
      if (unrolled) {
        myParticipant = unrolled;
      } else {
        return { error: "All participants have already rolled" };
      }
    }
    const value = Math.floor(Math.random() * 100) + 1;
    await submitRoll(params.id, myParticipant.id, value);
    const lobby = getLobby(params.id);
    if (lobby) {
      lobby.chat(`${myParticipant.team?.name ?? "Player"} rolled ${value} (via web)`).catch(() => {
      });
      const updated = await getMatchFull(params.id);
      if (updated.state === "PICKING") {
        const sorted = [...updated.participants].sort(
          (a, b) => (a.pickOrder ?? 99) - (b.pickOrder ?? 99)
        );
        lobby.chat(
          `Rolls complete! ${sorted[0]?.team.name} picks first. Use !pick <slot> (e.g. !pick NM1) or pick in web UI.`
        ).catch(() => {
        });
      }
    }
    return { rolled: value, participantId: myParticipant.id };
  },
  pick: async ({ params, request, locals }) => {
    if (!locals.user) redirect(302, "/");
    const form = await request.formData();
    const slotId = form.get("slotId")?.toString();
    if (!slotId) return { error: "No map selected" };
    const m = await getMatchFull(params.id);
    const sorted = [...m.participants].sort(
      (a, b) => (a.pickOrder ?? 99) - (b.pickOrder ?? 99)
    );
    const expectedIdx = m.games.length % sorted.length;
    const expectedPicker = sorted[expectedIdx];
    if (!expectedPicker) return { error: "Cannot determine picker" };
    try {
      const game = await pickMap(params.id, expectedPicker.id, slotId);
      playPickedMap(params.id, game.id).catch(
        (err) => console.error("[Match] IRC play failed:", err.message)
      );
      return { picked: true, gameId: game.id };
    } catch (e) {
      return { error: e.message };
    }
  },
  forceStart: async ({ params, locals }) => {
    if (!locals.user) redirect(302, "/");
    await forceStartGame(params.id);
    return { started: true };
  },
  cancel: async ({ params, locals }) => {
    if (!locals.user) redirect(302, "/");
    await cancelMatch(params.id);
    await closeLobby(params.id);
    redirect(303, "/matches");
  }
};

var _page_server_ts = /*#__PURE__*/Object.freeze({
  __proto__: null,
  actions: actions,
  load: load
});

const index = 8;
let component_cache;
const component = async () => component_cache ??= (await import('./_page.svelte-G6sWOX7O.js')).default;
const server_id = "src/routes/(app)/matches/[id]/+page.server.ts";
const imports = ["_app/immutable/nodes/8.CkbqikZq.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/BxEwC6Zc.js","_app/immutable/chunks/DoLu9QLy.js","_app/immutable/chunks/BQKoxf2Q.js","_app/immutable/chunks/kALFGdUG.js","_app/immutable/chunks/BLQQas77.js","_app/immutable/chunks/BAocuFgQ.js","_app/immutable/chunks/BkIq08el.js","_app/immutable/chunks/CvGSsBh3.js","_app/immutable/chunks/DAtZQVjv.js","_app/immutable/chunks/BnX5ZnVA.js","_app/immutable/chunks/BqOsL1Vv.js"];
const stylesheets = [];
const fonts = [];

export { component, fonts, imports, index, _page_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=8-Cct4CuMl.js.map
