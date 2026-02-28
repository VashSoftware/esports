import { error, json } from "@sveltejs/kit";
import { d as db, m as mappool } from "../../../../chunks/index2.js";
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
export {
  GET,
  POST
};
