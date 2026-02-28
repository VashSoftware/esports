import { e as error, j as json } from './index-B2LGyy1l.js';
import { d as db, b as mappool } from './index2-B7hVh_Qf.js';
import 'postgres';
import './shared-server-DaWdgxVh.js';

const GET = async ({ locals }) => {
  if (!locals.user) error(401, "Not logged in");
  const mappools = await db.query.mappool.findMany({
    orderBy: (m, { desc }) => [desc(m.createdAt)]
  });
  return json(mappools);
};
const POST = async ({ request, locals }) => {
  if (!locals.user) error(401, "Not logged in");
  const { name } = await request.json();
  if (!name?.trim()) error(400, "Name is required");
  const [created] = await db.insert(mappool).values({
    name: name.trim(),
    createdBy: locals.user.id
  }).returning();
  return json(created, { status: 201 });
};

export { GET, POST };
//# sourceMappingURL=_server.ts-CknVZIWY.js.map
