import { e as error, j as json } from './index-B2LGyy1l.js';
import { g as getBeatmap } from './api-DYV1cRWY.js';
import './shared-server-DaWdgxVh.js';
import './index2-B7hVh_Qf.js';
import 'postgres';

const GET = async ({ params, locals }) => {
  if (!locals.user) error(401, "Not logged in");
  try {
    const beatmap = await getBeatmap(params.id);
    return json(beatmap);
  } catch {
    error(404, "Beatmap not found");
  }
};

export { GET };
//# sourceMappingURL=_server.ts-DLwKwHxp.js.map
