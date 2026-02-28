import { d as db, b as match } from "../../../../chunks/index2.js";
import { redirect } from "@sveltejs/kit";
import { desc } from "drizzle-orm";
import { c as createMatch } from "../../../../chunks/engine.js";
import { i as initMatchLobby } from "../../../../chunks/orchestrator.js";
const load = async ({ locals }) => {
  if (!locals.user) redirect(302, "/");
  const matches = await db.query.match.findMany({
    with: { participants: { with: { team: true } } },
    orderBy: desc(match.createdAt),
    limit: 50
  });
  const teams = await db.query.team.findMany({
    orderBy: (t, { asc }) => [asc(t.name)]
  });
  const mappools = await db.query.mappool.findMany({
    with: { slots: true },
    orderBy: (m, { desc: desc2 }) => [desc2(m.createdAt)]
  });
  return { matches, teams, mappools };
};
const actions = {
  createMatch: async ({ request, locals }) => {
    if (!locals.user) redirect(302, "/");
    const form = await request.formData();
    const name = form.get("name")?.toString()?.trim() || "Custom Match";
    const team1Id = form.get("team1")?.toString();
    const team2Id = form.get("team2")?.toString();
    const mappoolId = form.get("mappool")?.toString();
    const bestOf = parseInt(form.get("bestOf")?.toString() ?? "7");
    console.log("[Matches] CREATE:", { name, team1Id, team2Id, mappoolId, bestOf });
    if (!team1Id || !team2Id || !mappoolId) {
      return { error: "All fields are required" };
    }
    let result;
    try {
      result = await createMatch({
        name,
        config: { bestOf, teamSize: 1, scoringType: "score" },
        mappoolId,
        teams: [team1Id, team2Id],
        createdBy: locals.user.id
      });
      console.log("[Matches] Created:", result.id);
    } catch (e) {
      console.error("[Matches] Error:", e);
      return { error: e.message };
    }
    initMatchLobby(result.id).catch((err) => {
      console.error("[Matches] IRC lobby failed:", err.message);
    });
    redirect(303, `/matches/${result.id}`);
  }
};
export {
  actions,
  load
};
