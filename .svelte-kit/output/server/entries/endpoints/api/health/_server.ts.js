import { json } from "@sveltejs/kit";
import { d as db } from "../../../../chunks/index2.js";
import { sql } from "drizzle-orm";
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
export {
  GET
};
