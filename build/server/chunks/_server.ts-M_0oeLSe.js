import { e as error, j as json } from './index-B2LGyy1l.js';
import { d as moveToRolling } from './engine-DiCmv1C-.js';
import './index2-B7hVh_Qf.js';
import 'postgres';
import './shared-server-DaWdgxVh.js';

const POST = async ({ params, locals }) => {
  if (!locals.user) error(401, "Not logged in");
  try {
    const m = await moveToRolling(params.id);
    return json(m);
  } catch (e) {
    error(400, e.message);
  }
};

export { POST };
//# sourceMappingURL=_server.ts-M_0oeLSe.js.map
