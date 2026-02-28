import { d as db, a as desc, m as match, i as inArray, t as team, b as mappool, e as eq } from './index2-B7hVh_Qf.js';
import { c as count } from './aggregate-CrXc04Dg.js';
import 'postgres';
import './shared-server-DaWdgxVh.js';

const load = async ({ locals }) => {
  if (!locals.user) {
    return {
      authenticated: false,
      recentMatches: [],
      liveMatches: [],
      stats: { matches: 0, finished: 0, teams: 0, mappools: 0 }
    };
  }
  const recentMatches = await db.query.match.findMany({
    with: { participants: { with: { team: true } } },
    orderBy: desc(match.createdAt),
    limit: 5
  });
  const liveMatches = await db.query.match.findMany({
    with: { participants: { with: { team: true } } },
    where: inArray(match.state, ["LOBBY", "ROLLING", "PICKING", "PLAYING"])
  });
  const [matchCount] = await db.select({ count: count() }).from(match);
  const [teamCount] = await db.select({ count: count() }).from(team);
  const [poolCount] = await db.select({ count: count() }).from(mappool);
  const [finishedCount] = await db.select({ count: count() }).from(match).where(eq(match.state, "FINISHED"));
  return {
    authenticated: true,
    recentMatches,
    liveMatches,
    stats: {
      matches: matchCount.count,
      finished: finishedCount.count,
      teams: teamCount.count,
      mappools: poolCount.count
    }
  };
};

var _page_server_ts = /*#__PURE__*/Object.freeze({
  __proto__: null,
  load: load
});

const index = 3;
let component_cache;
const component = async () => component_cache ??= (await import('./_page.svelte-C-71W7Xe.js')).default;
const server_id = "src/routes/(app)/+page.server.ts";
const imports = ["_app/immutable/nodes/3.CMuy9Bx3.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/BxEwC6Zc.js","_app/immutable/chunks/DoLu9QLy.js","_app/immutable/chunks/BQKoxf2Q.js","_app/immutable/chunks/kALFGdUG.js","_app/immutable/chunks/BLQQas77.js","_app/immutable/chunks/BnX5ZnVA.js","_app/immutable/chunks/BqOsL1Vv.js"];
const stylesheets = [];
const fonts = [];

export { component, fonts, imports, index, _page_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=3-BPD8edaL.js.map
