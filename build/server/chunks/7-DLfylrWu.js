import { d as db, a as desc, m as match } from './index2-B7hVh_Qf.js';
import { r as redirect } from './index-B2LGyy1l.js';
import { c as createMatch } from './engine-DiCmv1C-.js';
import { i as initMatchLobby } from './orchestrator-BMt7lT0G.js';
import 'postgres';
import './shared-server-DaWdgxVh.js';

const load = async ({ locals }) => {
  if (!locals.user) redirect(302, "/");
  const matches = await db.query.match.findMany({
    with: { participants: { with: { team: true } } },
    orderBy: desc(match.createdAt),
    limit: 50
  });
  const teams = await db.query.team.findMany({
    orderBy: (t, { asc }) => [asc(t.name)]
  });
  const mappools = await db.query.mappool.findMany({
    with: { slots: true },
    orderBy: (m, { desc: desc2 }) => [desc2(m.createdAt)]
  });
  return { matches, teams, mappools };
};
const actions = {
  createMatch: async ({ request, locals }) => {
    if (!locals.user) redirect(302, "/");
    const form = await request.formData();
    const name = form.get("name")?.toString()?.trim() || "Custom Match";
    const team1Id = form.get("team1")?.toString();
    const team2Id = form.get("team2")?.toString();
    const mappoolId = form.get("mappool")?.toString();
    const bestOf = parseInt(form.get("bestOf")?.toString() ?? "7");
    console.log("[Matches] CREATE:", { name, team1Id, team2Id, mappoolId, bestOf });
    if (!team1Id || !team2Id || !mappoolId) {
      return { error: "All fields are required" };
    }
    let result;
    try {
      result = await createMatch({
        name,
        config: { bestOf, teamSize: 1, scoringType: "score" },
        mappoolId,
        teams: [team1Id, team2Id],
        createdBy: locals.user.id
      });
      console.log("[Matches] Created:", result.id);
    } catch (e) {
      console.error("[Matches] Error:", e);
      return { error: e.message };
    }
    initMatchLobby(result.id).catch((err) => {
      console.error("[Matches] IRC lobby failed:", err.message);
    });
    redirect(303, `/matches/${result.id}`);
  }
};

var _page_server_ts = /*#__PURE__*/Object.freeze({
  __proto__: null,
  actions: actions,
  load: load
});

const index = 7;
let component_cache;
const component = async () => component_cache ??= (await import('./_page.svelte-Bj4oURhW.js')).default;
const server_id = "src/routes/(app)/matches/+page.server.ts";
const imports = ["_app/immutable/nodes/7._nuD3LlN.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/BxEwC6Zc.js","_app/immutable/chunks/DoLu9QLy.js","_app/immutable/chunks/BQKoxf2Q.js","_app/immutable/chunks/kALFGdUG.js","_app/immutable/chunks/BLQQas77.js","_app/immutable/chunks/BAocuFgQ.js","_app/immutable/chunks/BkIq08el.js","_app/immutable/chunks/CvGSsBh3.js","_app/immutable/chunks/DAtZQVjv.js","_app/immutable/chunks/BnX5ZnVA.js","_app/immutable/chunks/BqOsL1Vv.js"];
const stylesheets = [];
const fonts = [];

export { component, fonts, imports, index, _page_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=7-DLfylrWu.js.map
