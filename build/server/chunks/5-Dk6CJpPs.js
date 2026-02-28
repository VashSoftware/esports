import { d as db, b as mappool } from './index2-B7hVh_Qf.js';
import { r as redirect } from './index-B2LGyy1l.js';
import 'postgres';
import './shared-server-DaWdgxVh.js';

const load = async ({ locals }) => {
  if (!locals.user) redirect(302, "/");
  const mappools = await db.query.mappool.findMany({
    with: { slots: true },
    orderBy: (m, { desc }) => [desc(m.createdAt)]
  });
  return { mappools };
};
const actions = {
  create: async ({ request, locals }) => {
    if (!locals.user) redirect(302, "/");
    const form = await request.formData();
    const name = form.get("name")?.toString()?.trim();
    if (!name) return { error: "Name is required" };
    const [created] = await db.insert(mappool).values({ name, createdBy: locals.user.id }).returning();
    redirect(303, `/mappools/${created.id}`);
  }
};

var _page_server_ts = /*#__PURE__*/Object.freeze({
  __proto__: null,
  actions: actions,
  load: load
});

const index = 5;
let component_cache;
const component = async () => component_cache ??= (await import('./_page.svelte-ijSwFWFX.js')).default;
const server_id = "src/routes/(app)/mappools/+page.server.ts";
const imports = ["_app/immutable/nodes/5.CyqZcxti.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/BxEwC6Zc.js","_app/immutable/chunks/DoLu9QLy.js","_app/immutable/chunks/BQKoxf2Q.js","_app/immutable/chunks/kALFGdUG.js","_app/immutable/chunks/BLQQas77.js","_app/immutable/chunks/BAocuFgQ.js","_app/immutable/chunks/BkIq08el.js","_app/immutable/chunks/CvGSsBh3.js","_app/immutable/chunks/DAtZQVjv.js","_app/immutable/chunks/BnX5ZnVA.js"];
const stylesheets = [];
const fonts = [];

export { component, fonts, imports, index, _page_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=5-Dk6CJpPs.js.map
