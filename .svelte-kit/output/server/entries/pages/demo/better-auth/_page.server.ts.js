import { redirect } from "@sveltejs/kit";
import { a as auth } from "../../../../chunks/auth.js";
const load = async (event) => {
  if (!event.locals.user) {
    return redirect(302, "/demo/better-auth/login");
  }
  return { user: event.locals.user };
};
const actions = {
  signOut: async (event) => {
    await auth.api.signOut({
      headers: event.request.headers
    });
    return redirect(302, "/demo/better-auth/login");
  }
};
export {
  actions,
  load
};
