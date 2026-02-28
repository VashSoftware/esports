import { d as db, b as match, c as team, m as mappool } from "../../../chunks/index2.js";
import { desc, inArray, count, eq } from "drizzle-orm";
const load = async ({ locals }) => {
  if (!locals.user) {
    return {
      authenticated: false,
      recentMatches: [],
      liveMatches: [],
      stats: { matches: 0, finished: 0, teams: 0, mappools: 0 }
    };
  }
  const recentMatches = await db.query.match.findMany({
    with: { participants: { with: { team: true } } },
    orderBy: desc(match.createdAt),
    limit: 5
  });
  const liveMatches = await db.query.match.findMany({
    with: { participants: { with: { team: true } } },
    where: inArray(match.state, ["LOBBY", "ROLLING", "PICKING", "PLAYING"])
  });
  const [matchCount] = await db.select({ count: count() }).from(match);
  const [teamCount] = await db.select({ count: count() }).from(team);
  const [poolCount] = await db.select({ count: count() }).from(mappool);
  const [finishedCount] = await db.select({ count: count() }).from(match).where(eq(match.state, "FINISHED"));
  return {
    authenticated: true,
    recentMatches,
    liveMatches,
    stats: {
      matches: matchCount.count,
      finished: finishedCount.count,
      teams: teamCount.count,
      mappools: poolCount.count
    }
  };
};
export {
  load
};
