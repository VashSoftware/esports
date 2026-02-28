import { error, json } from "@sveltejs/kit";
import { d as db } from "../../../../chunks/index2.js";
import { c as createMatch } from "../../../../chunks/engine.js";
const GET = async ({ locals }) => {
  if (!locals.user) error(401, "Not logged in");
  const matches = await db.query.match.findMany({
    with: {
      participants: { with: { team: true } }
    },
    orderBy: (m, { desc }) => [desc(m.createdAt)]
  });
  return json(matches);
};
const POST = async ({ request, locals }) => {
  if (!locals.user) error(401, "Not logged in");
  const body = await request.json();
  const { name, config, mappoolId, teams } = body;
  if (!name || !config || !mappoolId || !teams?.length) {
    error(400, "Missing required fields");
  }
  try {
    const result = await createMatch({
      name,
      config,
      mappoolId,
      teams,
      createdBy: locals.user.id
    });
    return json(result, { status: 201 });
  } catch (e) {
    error(400, e.message);
  }
};
export {
  GET,
  POST
};
