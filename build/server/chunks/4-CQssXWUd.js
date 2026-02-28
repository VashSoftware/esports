import { d as db, a as desc, u as user, e as eq, p as playerRating } from './index2-B7hVh_Qf.js';
import { e as error } from './index-B2LGyy1l.js';
import 'postgres';
import './shared-server-DaWdgxVh.js';

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

var _page_server_ts = /*#__PURE__*/Object.freeze({
  __proto__: null,
  actions: actions,
  load: load
});

const index = 4;
let component_cache;
const component = async () => component_cache ??= (await import('./_page.svelte-6xWa24o9.js')).default;
const server_id = "src/routes/(app)/admin/+page.server.ts";
const imports = ["_app/immutable/nodes/4.BdC-uDW-.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/BxEwC6Zc.js","_app/immutable/chunks/DoLu9QLy.js","_app/immutable/chunks/BQKoxf2Q.js","_app/immutable/chunks/kALFGdUG.js","_app/immutable/chunks/BLQQas77.js","_app/immutable/chunks/BAocuFgQ.js","_app/immutable/chunks/BkIq08el.js","_app/immutable/chunks/CvGSsBh3.js","_app/immutable/chunks/DAtZQVjv.js","_app/immutable/chunks/BnX5ZnVA.js","_app/immutable/chunks/BqOsL1Vv.js","_app/immutable/chunks/Cy2QBcXt.js"];
const stylesheets = [];
const fonts = [];

export { component, fonts, imports, index, _page_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=4-CQssXWUd.js.map
