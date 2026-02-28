import * as server from '../entries/pages/(app)/teams/_page.server.ts.js';

export const index = 10;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/(app)/teams/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/(app)/teams/+page.server.ts";
export const imports = ["_app/immutable/nodes/10.BPlEN6_G.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/BxEwC6Zc.js","_app/immutable/chunks/DoLu9QLy.js","_app/immutable/chunks/BQKoxf2Q.js","_app/immutable/chunks/kALFGdUG.js","_app/immutable/chunks/BLQQas77.js","_app/immutable/chunks/BAocuFgQ.js","_app/immutable/chunks/BkIq08el.js","_app/immutable/chunks/CvGSsBh3.js","_app/immutable/chunks/DAtZQVjv.js","_app/immutable/chunks/BnX5ZnVA.js","_app/immutable/chunks/BqOsL1Vv.js","_app/immutable/chunks/CAkKRSSs.js"];
export const stylesheets = [];
export const fonts = [];
