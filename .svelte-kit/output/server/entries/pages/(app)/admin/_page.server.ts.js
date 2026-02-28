import { d as db, u as user, p as playerRating } from "../../../../chunks/index2.js";
import { eq, desc } from "drizzle-orm";
import { error } from "@sveltejs/kit";
const ROLE_HIERARCHY = {
  player: 0,
  referee: 1,
  admin: 2
};
function hasRole(userRole, minRole) {
  const level = ROLE_HIERARCHY[userRole] ?? 0;
  const required = ROLE_HIERARCHY[minRole];
  return level >= required;
}
function requireRole(locals, minRole, message = "Insufficient permissions") {
  if (!locals.user) {
    error(401, "Not logged in");
  }
  if (!hasRole(locals.user.role, minRole)) {
    error(403, message);
  }
}
async function setUserRole(userId, role) {
  await db.update(user).set({ role }).where(eq(user.id, userId));
}
const load = async ({ locals }) => {
  requireRole(locals, "admin");
  const users = await db.query.user.findMany({
    orderBy: desc(user.createdAt)
  });
  const usersWithRatings = await Promise.all(
    users.map(async (u) => {
      const rating = await db.query.playerRating.findFirst({
        where: eq(playerRating.userId, u.id)
      });
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        image: u.image,
        role: u.role ?? "player",
        createdAt: u.createdAt,
        elo: rating?.elo ?? 1e3,
        wins: rating?.wins ?? 0,
        losses: rating?.losses ?? 0
      };
    })
  );
  return { users: usersWithRatings };
};
const actions = {
  setRole: async ({ request, locals }) => {
    requireRole(locals, "admin");
    const form = await request.formData();
    const userId = form.get("userId")?.toString();
    const role = form.get("role")?.toString();
    if (!userId || !role) return { error: "User ID and role are required" };
    if (!["player", "referee", "admin"].includes(role)) {
      return { error: "Invalid role" };
    }
    if (userId === locals.user.id && role !== "admin") {
      return { error: "You can't demote yourself" };
    }
    await setUserRole(userId, role);
    return { success: true };
  }
};
export {
  actions,
  load
};
