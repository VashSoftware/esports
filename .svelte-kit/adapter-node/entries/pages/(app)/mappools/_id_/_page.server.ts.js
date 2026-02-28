import { d as db, m as mappool, a as mappoolSlot } from "../../../../../chunks/index2.js";
import { eq, and } from "drizzle-orm";
import { redirect, error } from "@sveltejs/kit";
import { g as getBeatmap } from "../../../../../chunks/api.js";
const load = async ({ params, locals }) => {
  if (!locals.user) redirect(302, "/");
  const pool = await db.query.mappool.findFirst({
    where: eq(mappool.id, params.id),
    with: {
      slots: {
        orderBy: (s, { asc }) => [asc(s.category), asc(s.orderInCategory)]
      }
    }
  });
  if (!pool) error(404, "Mappool not found");
  const slotsWithBeatmaps = await Promise.all(
    pool.slots.map(async (slot) => {
      try {
        const beatmap = await getBeatmap(slot.beatmapId);
        return {
          ...slot,
          beatmap: {
            title: beatmap.beatmapset.title,
            artist: beatmap.beatmapset.artist,
            version: beatmap.version,
            starRating: beatmap.difficulty_rating,
            bpm: beatmap.bpm,
            totalLength: beatmap.total_length,
            coverUrl: beatmap.beatmapset.covers["card@2x"],
            url: beatmap.url
          }
        };
      } catch {
        return {
          ...slot,
          beatmap: null
        };
      }
    })
  );
  return {
    pool: { ...pool, slots: slotsWithBeatmaps }
  };
};
const actions = {
  addSlot: async ({ params, request, locals }) => {
    if (!locals.user) redirect(302, "/");
    const form = await request.formData();
    let beatmapId = form.get("beatmapId")?.toString()?.trim();
    const category = form.get("category")?.toString()?.trim()?.toUpperCase();
    if (!beatmapId || !category) {
      return { error: "Beatmap ID and category are required" };
    }
    const urlMatch = beatmapId.match(/beatmaps\/(\d+)/);
    const setMatch = beatmapId.match(/beatmapsets\/\d+#\w+\/(\d+)/);
    if (urlMatch) beatmapId = urlMatch[1];
    else if (setMatch) beatmapId = setMatch[1];
    if (!/^\d+$/.test(beatmapId)) {
      return { error: "Invalid beatmap ID" };
    }
    let beatmap;
    try {
      beatmap = await getBeatmap(beatmapId);
    } catch {
      return { error: "Beatmap not found on osu!" };
    }
    const existing = await db.query.mappoolSlot.findMany({
      where: and(
        eq(mappoolSlot.mappoolId, params.id),
        eq(mappoolSlot.category, category)
      )
    });
    await db.insert(mappoolSlot).values({
      mappoolId: params.id,
      beatmapId,
      category,
      orderInCategory: existing.length + 1,
      starRating: beatmap.difficulty_rating,
      mods: category === "NM" || category === "TB" || category === "FM" ? [] : [category]
    });
    return { success: true };
  },
  removeSlot: async ({ request, locals }) => {
    if (!locals.user) redirect(302, "/");
    const form = await request.formData();
    const slotId = form.get("slotId")?.toString();
    if (!slotId) return { error: "Missing slot ID" };
    await db.delete(mappoolSlot).where(eq(mappoolSlot.id, slotId));
    return { success: true };
  },
  deletePool: async ({ params, locals }) => {
    if (!locals.user) redirect(302, "/");
    await db.delete(mappool).where(eq(mappool.id, params.id));
    redirect(303, "/mappools");
  }
};
export {
  actions,
  load
};
