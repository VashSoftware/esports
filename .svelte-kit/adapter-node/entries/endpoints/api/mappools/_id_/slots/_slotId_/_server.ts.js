import { error, json } from "@sveltejs/kit";
import { d as db, a as mappoolSlot } from "../../../../../../../chunks/index2.js";
import { eq } from "drizzle-orm";
const DELETE = async ({ params, locals }) => {
  if (!locals.user) error(401, "Not logged in");
  await db.delete(mappoolSlot).where(eq(mappoolSlot.id, params.slotId));
  return json({ ok: true });
};
export {
  DELETE
};
