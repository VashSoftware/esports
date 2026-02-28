import { e as error, j as json } from './index-B2LGyy1l.js';
import { a as cancelMatch, g as getMatchFull } from './engine-DiCmv1C-.js';
import './index2-B7hVh_Qf.js';
import 'postgres';
import './shared-server-DaWdgxVh.js';

const GET = async ({ params, locals }) => {
  if (!locals.user) error(401, "Not logged in");
  try {
    const m = await getMatchFull(params.id);
    return json(m);
  } catch (e) {
    error(404, e.message);
  }
};
const DELETE = async ({ params, locals }) => {
  if (!locals.user) error(401, "Not logged in");
  try {
    const m = await cancelMatch(params.id);
    return json(m);
  } catch (e) {
    error(400, e.message);
  }
};

export { DELETE, GET };
//# sourceMappingURL=_server.ts-KSG0NbEr.js.map
