import { d as db, c as team, t as teamMember, u as user } from "../../../../chunks/index2.js";
import { eq } from "drizzle-orm";
import { redirect } from "@sveltejs/kit";
const load = async ({ locals }) => {
  if (!locals.user) redirect(302, "/");
  const teams = await db.query.team.findMany({
    with: {
      members: true
    },
    orderBy: (t, { desc }) => [desc(t.createdAt)]
  });
  const teamsWithUsers = await Promise.all(
    teams.map(async (t) => {
      const membersWithUsers = await Promise.all(
        t.members.map(async (m) => {
          const u = await db.query.user.findFirst({
            where: eq(user.id, m.userId)
          });
          return { ...m, user: u ? { id: u.id, name: u.name, image: u.image } : null };
        })
      );
      return { ...t, members: membersWithUsers };
    })
  );
  return { teams: teamsWithUsers, userId: locals.user.id };
};
const actions = {
  create: async ({ request, locals }) => {
    if (!locals.user) redirect(302, "/");
    const form = await request.formData();
    const name = form.get("name")?.toString()?.trim();
    if (!name) return { error: "Team name is required" };
    const [created] = await db.insert(team).values({
      name,
      ownerId: locals.user.id,
      isPersonal: false
    }).returning();
    await db.insert(teamMember).values({
      teamId: created.id,
      userId: locals.user.id,
      role: "captain"
    });
    return { success: true };
  },
  addMember: async ({ request, locals }) => {
    if (!locals.user) redirect(302, "/");
    const form = await request.formData();
    const teamId = form.get("teamId")?.toString();
    const username = form.get("username")?.toString()?.trim();
    if (!teamId || !username) return { error: "Team and username are required" };
    const u = await db.query.user.findFirst({
      where: eq(user.name, username)
    });
    if (!u) return { error: `User "${username}" not found. They need to log in first.` };
    const existing = await db.query.teamMember.findFirst({
      where: (m, { and, eq: eq2 }) => and(eq2(m.teamId, teamId), eq2(m.userId, u.id))
    });
    if (existing) return { error: `${username} is already on this team` };
    await db.insert(teamMember).values({
      teamId,
      userId: u.id,
      role: "member"
    });
    return { success: true };
  },
  removeMember: async ({ request, locals }) => {
    if (!locals.user) redirect(302, "/");
    const form = await request.formData();
    const memberId = form.get("memberId")?.toString();
    if (!memberId) return { error: "Missing member ID" };
    await db.delete(teamMember).where(eq(teamMember.id, memberId));
    return { success: true };
  },
  deleteTeam: async ({ request, locals }) => {
    if (!locals.user) redirect(302, "/");
    const form = await request.formData();
    const teamId = form.get("teamId")?.toString();
    if (!teamId) return { error: "Missing team ID" };
    const t = await db.query.team.findFirst({ where: eq(team.id, teamId) });
    if (!t || t.ownerId !== locals.user.id) return { error: "Not authorized" };
    await db.delete(team).where(eq(team.id, teamId));
    return { success: true };
  }
};
export {
  actions,
  load
};
