import { r as redirect } from './index-B2LGyy1l.js';
import { a as auth } from './auth-CAP7sZek.js';
import { d as db, e as eq, p as playerRating, f as and, h as account } from './index2-B7hVh_Qf.js';
import './shared-server-DaWdgxVh.js';
import './root-D12ma0No.js';
import './index3-C4geC3K_.js';
import './utils-D_bK1W85.js';
import './shared-DWC9PG0H.js';
import './aggregate-CrXc04Dg.js';
import 'postgres';

const load = async ({ locals }) => {
  if (!locals.user) redirect(302, "/");
  const rating = await db.query.playerRating.findFirst({
    where: eq(playerRating.userId, locals.user.id)
  });
  const osuAccount = await db.query.account.findFirst({
    where: and(eq(account.userId, locals.user.id), eq(account.providerId, "osu"))
  });
  return {
    profile: {
      id: locals.user.id,
      name: locals.user.name,
      email: locals.user.email,
      image: locals.user.image,
      role: locals.user.role ?? "player",
      createdAt: locals.user.createdAt
    },
    rating: rating ? { elo: rating.elo, wins: rating.wins, losses: rating.losses } : { elo: 1e3, wins: 0, losses: 0 },
    hasOsuLinked: !!osuAccount
  };
};
const actions = {
  logout: async (event) => {
    await auth.api.signOut({
      headers: event.request.headers
    });
    redirect(302, "/");
  }
};

var _page_server_ts = /*#__PURE__*/Object.freeze({
  __proto__: null,
  actions: actions,
  load: load
});

const index = 9;
let component_cache;
const component = async () => component_cache ??= (await import('./_page.svelte-D23V0tpa.js')).default;
const server_id = "src/routes/(app)/settings/+page.server.ts";
const imports = ["_app/immutable/nodes/9.BTBc_Eli.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/BxEwC6Zc.js","_app/immutable/chunks/DoLu9QLy.js","_app/immutable/chunks/BQKoxf2Q.js","_app/immutable/chunks/kALFGdUG.js","_app/immutable/chunks/BAocuFgQ.js","_app/immutable/chunks/BkIq08el.js","_app/immutable/chunks/CvGSsBh3.js","_app/immutable/chunks/DAtZQVjv.js","_app/immutable/chunks/BnX5ZnVA.js","_app/immutable/chunks/BqOsL1Vv.js"];
const stylesheets = [];
const fonts = [];

export { component, fonts, imports, index, _page_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=9-DztSgTEC.js.map
