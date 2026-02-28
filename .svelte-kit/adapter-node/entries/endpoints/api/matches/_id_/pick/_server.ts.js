import { error, json } from "@sveltejs/kit";
import { p as pickMap } from "../../../../../../chunks/engine.js";
const POST = async ({ params, request, locals }) => {
  if (!locals.user) error(401, "Not logged in");
  const { participantId, mappoolSlotId } = await request.json();
  if (!participantId || !mappoolSlotId) {
    error(400, "participantId and mappoolSlotId required");
  }
  try {
    const game = await pickMap(params.id, participantId, mappoolSlotId);
    return json(game);
  } catch (e) {
    error(400, e.message);
  }
};
export {
  POST
};
