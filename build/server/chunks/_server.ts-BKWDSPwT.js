import { e as error, j as json } from './index-B2LGyy1l.js';
import { p as pickMap } from './engine-DiCmv1C-.js';
import './index2-B7hVh_Qf.js';
import 'postgres';
import './shared-server-DaWdgxVh.js';

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

export { POST };
//# sourceMappingURL=_server.ts-BKWDSPwT.js.map
