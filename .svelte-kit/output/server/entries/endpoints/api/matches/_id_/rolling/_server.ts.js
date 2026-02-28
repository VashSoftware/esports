import { error, json } from "@sveltejs/kit";
import { b as moveToRolling } from "../../../../../../chunks/engine.js";
const POST = async ({ params, locals }) => {
  if (!locals.user) error(401, "Not logged in");
  try {
    const m = await moveToRolling(params.id);
    return json(m);
  } catch (e) {
    error(400, e.message);
  }
};
export {
  POST
};
