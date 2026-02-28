import { j as json } from './index-B2LGyy1l.js';
import { d as db, x as sql } from './index2-B7hVh_Qf.js';
import 'postgres';
import './shared-server-DaWdgxVh.js';

const GET = async () => {
  try {
    await db.execute(sql`SELECT 1`);
    return json({
      status: "ok",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      uptime: process.uptime()
    });
  } catch (e) {
    return json(
      {
        status: "error",
        error: "Database connection failed",
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      },
      { status: 503 }
    );
  }
};

export { GET };
//# sourceMappingURL=_server.ts-Cp6RS2Xl.js.map
