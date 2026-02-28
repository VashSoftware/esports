import { error, json } from "@sveltejs/kit";
import { a as cancelMatch, g as getMatchFull } from "../../../../../chunks/engine.js";
const GET = async ({ params, locals }) => {
  if (!locals.user) error(401, "Not logged in");
  try {
    const m = await getMatchFull(params.id);
    return json(m);
  } catch (e) {
    error(404, e.message);
  }
};
const DELETE = async ({ params, locals }) => {
  if (!locals.user) error(401, "Not logged in");
  try {
    const m = await cancelMatch(params.id);
    return json(m);
  } catch (e) {
    error(400, e.message);
  }
};
export {
  DELETE,
  GET
};
