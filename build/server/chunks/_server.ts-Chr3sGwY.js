import { e as error, j as json } from './index-B2LGyy1l.js';
import { d as db, f as and, e as eq, c as mappoolSlot } from './index2-B7hVh_Qf.js';
import 'postgres';
import './shared-server-DaWdgxVh.js';

const POST = async ({ params, request, locals }) => {
  if (!locals.user) error(401, "Not logged in");
  const { beatmapId, category, mods } = await request.json();
  if (!beatmapId || !category) {
    error(400, "beatmapId and category are required");
  }
  const existing = await db.query.mappoolSlot.findMany({
    where: and(
      eq(mappoolSlot.mappoolId, params.id),
      eq(mappoolSlot.category, category.toUpperCase())
    )
  });
  const [created] = await db.insert(mappoolSlot).values({
    mappoolId: params.id,
    beatmapId: String(beatmapId),
    category: category.toUpperCase(),
    orderInCategory: existing.length + 1,
    mods: mods ?? []
  }).returning();
  return json(created, { status: 201 });
};

export { POST };
//# sourceMappingURL=_server.ts-Chr3sGwY.js.map
