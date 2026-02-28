import { error, json } from "@sveltejs/kit";
import { d as db, m as mappool, a as mappoolSlot } from "../../../../../chunks/index2.js";
import { eq } from "drizzle-orm";
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
export {
  DELETE,
  GET
};
