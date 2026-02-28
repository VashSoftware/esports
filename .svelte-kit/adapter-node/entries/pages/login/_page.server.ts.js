import { redirect } from "@sveltejs/kit";
import { a as auth } from "../../../chunks/auth.js";
const load = async (event) => {
  if (event.locals.user) redirect(302, "/");
  const result = await auth.api.signInSocial({
    body: {
      provider: "osu",
      callbackURL: "/"
    }
  });
  if (result.url) redirect(302, result.url);
  return {};
};
export {
  load
};
