import { e as error, j as json } from './index-B2LGyy1l.js';
import { d as db, b as mappool, e as eq, c as mappoolSlot } from './index2-B7hVh_Qf.js';
import 'postgres';
import './shared-server-DaWdgxVh.js';

const GET = async ({ params, locals }) => {
  if (!locals.user) error(401, "Not logged in");
  const pool = await db.query.mappool.findFirst({
    where: eq(mappool.id, params.id)
  });
  if (!pool) error(404, "Mappool not found");
  const slots = await db.query.mappoolSlot.findMany({
    where: eq(mappoolSlot.mappoolId, params.id),
    orderBy: (s, { asc }) => [asc(s.category), asc(s.orderInCategory)]
  });
  return json({ ...pool, slots });
};
const DELETE = async ({ params, locals }) => {
  if (!locals.user) error(401, "Not logged in");
  await db.delete(mappool).where(eq(mappool.id, params.id));
  return json({ ok: true });
};

export { DELETE, GET };
//# sourceMappingURL=_server.ts-CYhG9EuN.js.map
