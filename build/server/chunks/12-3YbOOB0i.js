import { r as redirect } from './index-B2LGyy1l.js';
import { a as auth } from './auth-CAP7sZek.js';
import './shared-server-DaWdgxVh.js';
import './root-D12ma0No.js';
import './index3-C4geC3K_.js';
import './utils-D_bK1W85.js';
import './shared-DWC9PG0H.js';
import './index2-B7hVh_Qf.js';
import 'postgres';
import './aggregate-CrXc04Dg.js';

const load = async (event) => {
  if (!event.locals.user) {
    return redirect(302, "/demo/better-auth/login");
  }
  return { user: event.locals.user };
};
const actions = {
  signOut: async (event) => {
    await auth.api.signOut({
      headers: event.request.headers
    });
    return redirect(302, "/demo/better-auth/login");
  }
};

var _page_server_ts = /*#__PURE__*/Object.freeze({
  __proto__: null,
  actions: actions,
  load: load
});

const index = 12;
let component_cache;
const component = async () => component_cache ??= (await import('./_page.svelte-Ctzd-tuM.js')).default;
const server_id = "src/routes/demo/better-auth/+page.server.ts";
const imports = ["_app/immutable/nodes/12.C9UZWAjJ.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/BxEwC6Zc.js","_app/immutable/chunks/DoLu9QLy.js","_app/immutable/chunks/BAocuFgQ.js","_app/immutable/chunks/BkIq08el.js","_app/immutable/chunks/CvGSsBh3.js","_app/immutable/chunks/DAtZQVjv.js"];
const stylesheets = [];
const fonts = [];

export { component, fonts, imports, index, _page_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=12-3YbOOB0i.js.map
