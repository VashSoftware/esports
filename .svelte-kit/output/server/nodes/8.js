import * as server from '../entries/pages/(app)/matches/_id_/_page.server.ts.js';

export const index = 8;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/(app)/matches/_id_/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/(app)/matches/[id]/+page.server.ts";
export const imports = ["_app/immutable/nodes/8.CkbqikZq.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/BxEwC6Zc.js","_app/immutable/chunks/DoLu9QLy.js","_app/immutable/chunks/BQKoxf2Q.js","_app/immutable/chunks/kALFGdUG.js","_app/immutable/chunks/BLQQas77.js","_app/immutable/chunks/BAocuFgQ.js","_app/immutable/chunks/BkIq08el.js","_app/immutable/chunks/CvGSsBh3.js","_app/immutable/chunks/DAtZQVjv.js","_app/immutable/chunks/BnX5ZnVA.js","_app/immutable/chunks/BqOsL1Vv.js"];
export const stylesheets = [];
export const fonts = [];
