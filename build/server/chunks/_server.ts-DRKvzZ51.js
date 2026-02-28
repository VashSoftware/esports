import { e as error, j as json } from './index-B2LGyy1l.js';
import { l as leaveQueue, e as getQueueStatus, j as joinQueue } from './engine-DiCmv1C-.js';
import { d as db, e as eq, j as teamMember } from './index2-B7hVh_Qf.js';
import 'postgres';
import './shared-server-DaWdgxVh.js';

const GET = async ({ locals }) => {
  if (!locals.user) error(401, "Not logged in");
  const status = await getQueueStatus(locals.user.id);
  return json(status);
};
const POST = async ({ locals }) => {
  if (!locals.user) error(401, "Not logged in");
  const membership = await db.query.teamMember.findFirst({
    where: eq(teamMember.userId, locals.user.id),
    with: { team: true }
  });
  const personalTeam = membership?.team;
  if (!personalTeam?.isPersonal) {
    error(400, "No personal team found");
  }
  try {
    const result = await joinQueue(locals.user.id, personalTeam.id);
    return json({ matched: !!result, match: result });
  } catch (e) {
    error(400, e.message);
  }
};
const DELETE = async ({ locals }) => {
  if (!locals.user) error(401, "Not logged in");
  await leaveQueue(locals.user.id);
  return json({ ok: true });
};

export { DELETE, GET, POST };
//# sourceMappingURL=_server.ts-DRKvzZ51.js.map
