import { redirect } from "@sveltejs/kit";
import { a as auth } from "../../../../chunks/auth.js";
import { d as db, p as playerRating, j as account } from "../../../../chunks/index2.js";
import { eq, and } from "drizzle-orm";
const load = async ({ locals }) => {
  if (!locals.user) redirect(302, "/");
  const rating = await db.query.playerRating.findFirst({
    where: eq(playerRating.userId, locals.user.id)
  });
  const osuAccount = await db.query.account.findFirst({
    where: and(eq(account.userId, locals.user.id), eq(account.providerId, "osu"))
  });
  return {
    profile: {
      id: locals.user.id,
      name: locals.user.name,
      email: locals.user.email,
      image: locals.user.image,
      role: locals.user.role ?? "player",
      createdAt: locals.user.createdAt
    },
    rating: rating ? { elo: rating.elo, wins: rating.wins, losses: rating.losses } : { elo: 1e3, wins: 0, losses: 0 },
    hasOsuLinked: !!osuAccount
  };
};
const actions = {
  logout: async (event) => {
    await auth.api.signOut({
      headers: event.request.headers
    });
    redirect(302, "/");
  }
};
export {
  actions,
  load
};
