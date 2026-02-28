import { e as error, j as json } from './index-B2LGyy1l.js';
import { d as db, c as mappoolSlot, e as eq } from './index2-B7hVh_Qf.js';
import 'postgres';
import './shared-server-DaWdgxVh.js';

const DELETE = async ({ params, locals }) => {
  if (!locals.user) error(401, "Not logged in");
  await db.delete(mappoolSlot).where(eq(mappoolSlot.id, params.slotId));
  return json({ ok: true });
};

export { DELETE };
//# sourceMappingURL=_server.ts-wwm7Wb6_.js.map
