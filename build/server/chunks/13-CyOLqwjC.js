import { r as redirect, f as fail } from './index-B2LGyy1l.js';
import { a as auth, A as APIError } from './auth-CAP7sZek.js';
import './shared-server-DaWdgxVh.js';
import './root-D12ma0No.js';
import './index3-C4geC3K_.js';
import './utils-D_bK1W85.js';
import './shared-DWC9PG0H.js';
import './index2-B7hVh_Qf.js';
import 'postgres';
import './aggregate-CrXc04Dg.js';

const load = async (event) => {
  if (event.locals.user) {
    return redirect(302, "/demo/better-auth");
  }
  return {};
};
const actions = {
  signInEmail: async (event) => {
    const formData = await event.request.formData();
    const email = formData.get("email")?.toString() ?? "";
    const password = formData.get("password")?.toString() ?? "";
    try {
      await auth.api.signInEmail({
        body: {
          email,
          password,
          callbackURL: "/auth/verification-success"
        }
      });
    } catch (error) {
      if (error instanceof APIError) {
        return fail(400, { message: error.message || "Signin failed" });
      }
      return fail(500, { message: "Unexpected error" });
    }
    return redirect(302, "/demo/better-auth");
  },
  signUpEmail: async (event) => {
    const formData = await event.request.formData();
    const email = formData.get("email")?.toString() ?? "";
    const password = formData.get("password")?.toString() ?? "";
    const name = formData.get("name")?.toString() ?? "";
    try {
      await auth.api.signUpEmail({
        body: {
          email,
          password,
          name,
          callbackURL: "/auth/verification-success"
        }
      });
    } catch (error) {
      if (error instanceof APIError) {
        return fail(400, { message: error.message || "Registration failed" });
      }
      return fail(500, { message: "Unexpected error" });
    }
    return redirect(302, "/demo/better-auth");
  },
  signInSocial: async (event) => {
    const formData = await event.request.formData();
    const provider = formData.get("provider")?.toString() ?? "osu";
    const callbackURL = formData.get("callbackURL")?.toString() ?? "/demo/better-auth";
    const result = await auth.api.signInSocial({
      body: {
        provider,
        callbackURL
      }
    });
    if (result.url) {
      return redirect(302, result.url);
    }
    return fail(400, { message: "Social sign-in failed" });
  }
};

var _page_server_ts = /*#__PURE__*/Object.freeze({
  __proto__: null,
  actions: actions,
  load: load
});

const index = 13;
let component_cache;
const component = async () => component_cache ??= (await import('./_page.svelte-ad4cZnqC.js')).default;
const server_id = "src/routes/demo/better-auth/login/+page.server.ts";
const imports = ["_app/immutable/nodes/13.CyZ4e6yK.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/BxEwC6Zc.js","_app/immutable/chunks/DoLu9QLy.js","_app/immutable/chunks/BAocuFgQ.js","_app/immutable/chunks/BkIq08el.js","_app/immutable/chunks/CvGSsBh3.js","_app/immutable/chunks/DAtZQVjv.js"];
const stylesheets = [];
const fonts = [];

export { component, fonts, imports, index, _page_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=13-CyOLqwjC.js.map
