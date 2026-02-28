import { b as building } from "../chunks/environment.js";
import { a as auth, s as svelteKitHandler } from "../chunks/auth.js";
import { d as db, u as user } from "../chunks/index2.js";
import { eq } from "drizzle-orm";
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
export {
  handle
};
