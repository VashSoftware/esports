import { error, json } from "@sveltejs/kit";
import { m as moveToLobby } from "../../../../../../chunks/engine.js";
const POST = async ({ params, request, locals }) => {
  if (!locals.user) error(401, "Not logged in");
  const body = await request.json().catch(() => ({}));
  try {
    const m = await moveToLobby(params.id, body.osuLobbyId);
    return json(m);
  } catch (e) {
    error(400, e.message);
  }
};
export {
  POST
};
