import { e as error, j as json } from './index-B2LGyy1l.js';
import { s as submitRoll } from './engine-DiCmv1C-.js';
import './index2-B7hVh_Qf.js';
import 'postgres';
import './shared-server-DaWdgxVh.js';

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

export { POST };
//# sourceMappingURL=_server.ts-kIjYmsyw.js.map
