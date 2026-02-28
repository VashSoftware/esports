import { error, json } from "@sveltejs/kit";
import { g as getBeatmap } from "../../../../../../chunks/api.js";
const GET = async ({ params, locals }) => {
  if (!locals.user) error(401, "Not logged in");
  try {
    const beatmap = await getBeatmap(params.id);
    return json(beatmap);
  } catch {
    error(404, "Beatmap not found");
  }
};
export {
  GET
};
