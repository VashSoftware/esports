import { e as error, j as json } from './index-B2LGyy1l.js';
import { b as submitGameScores } from './engine-DiCmv1C-.js';
import './index2-B7hVh_Qf.js';
import 'postgres';
import './shared-server-DaWdgxVh.js';

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

export { POST };
//# sourceMappingURL=_server.ts-C5pGCspz.js.map
