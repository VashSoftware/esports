import * as server from '../entries/pages/(app)/_layout.server.ts.js';

export const index = 2;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/(app)/_layout.svelte.js')).default;
export { server };
export const server_id = "src/routes/(app)/+layout.server.ts";
export const imports = ["_app/immutable/nodes/2.BsR2_q_w.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/BxEwC6Zc.js","_app/immutable/chunks/CyUoLS3q.js","_app/immutable/chunks/kALFGdUG.js","_app/immutable/chunks/BQKoxf2Q.js","_app/immutable/chunks/DoLu9QLy.js","_app/immutable/chunks/BLQQas77.js","_app/immutable/chunks/BnX5ZnVA.js","_app/immutable/chunks/BqOsL1Vv.js","_app/immutable/chunks/D2SGgx9j.js","_app/immutable/chunks/DAtZQVjv.js","_app/immutable/chunks/CvGSsBh3.js","_app/immutable/chunks/BkIq08el.js","_app/immutable/chunks/BAocuFgQ.js"];
export const stylesheets = ["_app/immutable/assets/2.Dv2no-8m.css"];
export const fonts = [];
