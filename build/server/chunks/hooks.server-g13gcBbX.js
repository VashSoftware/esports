import { a as auth, s as svelteKitHandler } from './auth-CAP7sZek.js';
import { d as db, e as eq, u as user } from './index2-B7hVh_Qf.js';
import './shared-server-DaWdgxVh.js';
import './root-D12ma0No.js';
import './index3-C4geC3K_.js';
import './utils-D_bK1W85.js';
import './index-B2LGyy1l.js';
import './shared-DWC9PG0H.js';
import './aggregate-CrXc04Dg.js';
import 'postgres';

let building = false;

const handleBetterAuth = async ({ event, resolve }) => {
  const session = await auth.api.getSession({ headers: event.request.headers });
  if (session) {
    event.locals.session = session.session;
    const dbUser = await db.query.user.findFirst({
      where: eq(user.id, session.user.id)
    });
    event.locals.user = {
      ...session.user,
      role: dbUser?.role ?? "player"
    };
  }
  return svelteKitHandler({ event, resolve, auth, building });
};
const handle = handleBetterAuth;

export { handle };
//# sourceMappingURL=hooks.server-g13gcBbX.js.map
