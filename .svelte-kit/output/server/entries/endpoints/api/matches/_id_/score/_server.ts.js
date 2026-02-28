import { error, json } from "@sveltejs/kit";
import { d as submitGameScores } from "../../../../../../chunks/engine.js";
const POST = async ({ request, locals }) => {
  if (!locals.user) error(401, "Not logged in");
  const { matchGameId, scores } = await request.json();
  if (!matchGameId || !scores?.length) {
    error(400, "matchGameId and scores required");
  }
  try {
    const m = await submitGameScores(matchGameId, scores);
    return json(m);
  } catch (e) {
    error(400, e.message);
  }
};
export {
  POST
};
