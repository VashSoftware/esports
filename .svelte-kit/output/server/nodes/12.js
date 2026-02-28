import * as server from '../entries/pages/demo/better-auth/_page.server.ts.js';

export const index = 12;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/demo/better-auth/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/demo/better-auth/+page.server.ts";
export const imports = ["_app/immutable/nodes/12.C9UZWAjJ.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/BxEwC6Zc.js","_app/immutable/chunks/DoLu9QLy.js","_app/immutable/chunks/BAocuFgQ.js","_app/immutable/chunks/BkIq08el.js","_app/immutable/chunks/CvGSsBh3.js","_app/immutable/chunks/DAtZQVjv.js"];
export const stylesheets = [];
export const fonts = [];
