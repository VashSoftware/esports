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
  if (event.locals.user) redirect(302, "/");
  const result = await auth.api.signInSocial({
    body: {
      provider: "osu",
      callbackURL: "/"
    }
  });
  if (result.url) redirect(302, result.url);
  return {};
};

var _page_server_ts = /*#__PURE__*/Object.freeze({
  __proto__: null,
  load: load
});

const index = 14;
const server_id = "src/routes/login/+page.server.ts";
const imports = [];
const stylesheets = [];
const fonts = [];

export { fonts, imports, index, _page_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=14-BMPOArNY.js.map
