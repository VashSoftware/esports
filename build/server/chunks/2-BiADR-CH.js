const load = async ({ locals }) => {
  return {
    user: locals.user ? {
      id: locals.user.id,
      name: locals.user.name,
      email: locals.user.email,
      image: locals.user.image,
      role: locals.user.role ?? "player"
    } : null
  };
};

var _layout_server_ts = /*#__PURE__*/Object.freeze({
  __proto__: null,
  load: load
});

const index = 2;
let component_cache;
const component = async () => component_cache ??= (await import('./_layout.svelte-BV7ZtoED.js')).default;
const server_id = "src/routes/(app)/+layout.server.ts";
const imports = ["_app/immutable/nodes/2.BsR2_q_w.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/BxEwC6Zc.js","_app/immutable/chunks/CyUoLS3q.js","_app/immutable/chunks/kALFGdUG.js","_app/immutable/chunks/BQKoxf2Q.js","_app/immutable/chunks/DoLu9QLy.js","_app/immutable/chunks/BLQQas77.js","_app/immutable/chunks/BnX5ZnVA.js","_app/immutable/chunks/BqOsL1Vv.js","_app/immutable/chunks/D2SGgx9j.js","_app/immutable/chunks/DAtZQVjv.js","_app/immutable/chunks/CvGSsBh3.js","_app/immutable/chunks/BkIq08el.js","_app/immutable/chunks/BAocuFgQ.js"];
const stylesheets = ["_app/immutable/assets/2.Dv2no-8m.css"];
const fonts = [];

export { component, fonts, imports, index, _layout_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=2-BiADR-CH.js.map
