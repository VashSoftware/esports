import { d as db, m as mappool } from "../../../../chunks/index2.js";
import { redirect } from "@sveltejs/kit";
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
export {
  actions,
  load
};
