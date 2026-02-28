import { e as error, j as json } from './index-B2LGyy1l.js';
import { d as db } from './index2-B7hVh_Qf.js';
import { c as createMatch } from './engine-DiCmv1C-.js';
import 'postgres';
import './shared-server-DaWdgxVh.js';

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

export { GET, POST };
//# sourceMappingURL=_server.ts-BEoJR5yQ.js.map
