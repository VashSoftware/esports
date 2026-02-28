import { e as error, j as json } from './index-B2LGyy1l.js';
import { m as moveToLobby } from './engine-DiCmv1C-.js';
import './index2-B7hVh_Qf.js';
import 'postgres';
import './shared-server-DaWdgxVh.js';

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

export { POST };
//# sourceMappingURL=_server.ts-CgeuSTTA.js.map
