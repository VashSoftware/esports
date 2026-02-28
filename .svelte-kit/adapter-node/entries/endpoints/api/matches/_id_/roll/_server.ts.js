import { error, json } from "@sveltejs/kit";
import { s as submitRoll } from "../../../../../../chunks/engine.js";
const POST = async ({ params, request, locals }) => {
  if (!locals.user) error(401, "Not logged in");
  const { participantId, value } = await request.json();
  if (!participantId || value == null) {
    error(400, "participantId and value required");
  }
  try {
    const m = await submitRoll(params.id, participantId, value);
    return json(m);
  } catch (e) {
    error(400, e.message);
  }
};
export {
  POST
};
