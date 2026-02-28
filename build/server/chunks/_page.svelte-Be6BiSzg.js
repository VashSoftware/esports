import { a6 as escape_html, a8 as ensure_array_like, a9 as attr, aa as attr_class, a1 as derived, ab as stringify } from './index3-C4geC3K_.js';
import './root-D12ma0No.js';
import './utils-D_bK1W85.js';
import './exports-B5ORJhfK.js';
import './state.svelte-DvHRBIfo.js';

function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { data } = $$props;
    const categories = ["NM", "HD", "HR", "DT", "FM", "TB"];
    let addingCategory = "NM";
    let beatmapInput = "";
    const grouped = derived(() => () => {
      const groups = {};
      for (const cat of categories) {
        const slots = data.pool.slots.filter((s) => s.category === cat);
        if (slots.length > 0) groups[cat] = slots;
      }
      return groups;
    });
    function formatLength(seconds) {
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      return `${m}:${s.toString().padStart(2, "0")}`;
    }
    const categoryColors = {
      NM: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      HD: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
      HR: "bg-red-500/20 text-red-400 border-red-500/30",
      DT: "bg-purple-500/20 text-purple-400 border-purple-500/30",
      FM: "bg-green-500/20 text-green-400 border-green-500/30",
      TB: "bg-pink-500/20 text-pink-400 border-pink-500/30"
    };
    $$renderer2.push(`<div class="mx-auto max-w-4xl"><div class="flex items-center justify-between"><div class="flex items-center gap-3"><a href="/mappools" class="text-text-secondary transition-colors hover:text-text-primary">←</a> <div><h1 class="text-2xl font-700 tracking-tight">${escape_html(data.pool.name)}</h1> <p class="mt-1 text-sm text-text-secondary">${escape_html(data.pool.slots.length)} map${escape_html(data.pool.slots.length !== 1 ? "s" : "")}</p></div></div> <form method="post" action="?/deletePool"><button type="submit" class="rounded-md border border-red-500/30 px-3 py-1.5 text-sm text-red-400 transition-colors hover:bg-red-500/10">Delete Pool</button></form></div> <form method="post" action="?/addSlot" class="mt-6 rounded-lg border border-border bg-surface-800 p-4"><h2 class="text-sm font-600">Add Map</h2> <div class="mt-3 flex gap-3">`);
    $$renderer2.select(
      {
        name: "category",
        value: addingCategory,
        class: "rounded-md border border-border bg-surface-700 px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
      },
      ($$renderer3) => {
        $$renderer3.push(`<!--[-->`);
        const each_array = ensure_array_like(categories);
        for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
          let cat = each_array[$$index];
          $$renderer3.option({ value: cat }, ($$renderer4) => {
            $$renderer4.push(`${escape_html(cat)}`);
          });
        }
        $$renderer3.push(`<!--]-->`);
      }
    );
    $$renderer2.push(` <input type="text" name="beatmapId"${attr("value", beatmapInput)} placeholder="Beatmap ID or URL (e.g. 75 or https://osu.ppy.sh/beatmaps/75)" class="flex-1 rounded-md border border-border bg-surface-700 px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/50 focus:border-accent focus:outline-none"/> <button type="submit"${attr("disabled", !beatmapInput.trim(), true)} class="rounded-md bg-accent px-4 py-2 text-sm font-600 text-surface-900 transition-colors hover:bg-accent-hover disabled:opacity-50">${escape_html("Add")}</button></div> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></form> <div class="mt-6 flex flex-col gap-6">`);
    const each_array_1 = ensure_array_like(Object.entries(grouped()()));
    if (each_array_1.length !== 0) {
      $$renderer2.push("<!--[-->");
      for (let $$index_2 = 0, $$length = each_array_1.length; $$index_2 < $$length; $$index_2++) {
        let [category, slots] = each_array_1[$$index_2];
        $$renderer2.push(`<div><div class="mb-2 flex items-center gap-2"><span${attr_class(`rounded border px-2 py-0.5 text-xs font-600 ${stringify(categoryColors[category] ?? "bg-surface-600 text-text-secondary border-border")}`)}>${escape_html(category)}</span> <span class="text-xs text-text-secondary">${escape_html(slots.length)} map${escape_html(slots.length !== 1 ? "s" : "")}</span></div> <div class="flex flex-col gap-2"><!--[-->`);
        const each_array_2 = ensure_array_like(slots);
        for (let i = 0, $$length2 = each_array_2.length; i < $$length2; i++) {
          let slot = each_array_2[i];
          $$renderer2.push(`<div class="group flex items-center gap-3 rounded-lg border border-border bg-surface-800 p-2 transition-colors hover:border-accent/30">`);
          if (slot.beatmap?.coverUrl) {
            $$renderer2.push("<!--[-->");
            $$renderer2.push(`<img${attr("src", slot.beatmap.coverUrl)} alt="" class="h-12 w-24 rounded object-cover"/>`);
          } else {
            $$renderer2.push("<!--[!-->");
            $$renderer2.push(`<div class="flex h-12 w-24 items-center justify-center rounded bg-surface-700 text-xs text-text-secondary">No cover</div>`);
          }
          $$renderer2.push(`<!--]--> <div class="min-w-0 flex-1">`);
          if (slot.beatmap) {
            $$renderer2.push("<!--[-->");
            $$renderer2.push(`<a${attr("href", slot.beatmap.url)} target="_blank" rel="noopener" class="truncate text-sm font-500 hover:text-accent">${escape_html(slot.beatmap.artist)} - ${escape_html(slot.beatmap.title)}</a> <div class="mt-0.5 flex items-center gap-3 text-xs text-text-secondary"><span>[${escape_html(slot.beatmap.version)}]</span> <span>★ ${escape_html(slot.beatmap.starRating.toFixed(2))}</span> <span>${escape_html(slot.beatmap.bpm)} BPM</span> <span>${escape_html(formatLength(slot.beatmap.totalLength))}</span></div>`);
          } else {
            $$renderer2.push("<!--[!-->");
            $$renderer2.push(`<p class="text-sm text-text-secondary">Beatmap #${escape_html(slot.beatmapId)}</p>`);
          }
          $$renderer2.push(`<!--]--></div> <span class="text-xs font-600 text-text-secondary">${escape_html(category)}${escape_html(i + 1)}</span> <form method="post" action="?/removeSlot"><input type="hidden" name="slotId"${attr("value", slot.id)}/> <button type="submit" class="rounded p-1 text-text-secondary opacity-0 transition-all hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100">✕</button></form></div>`);
        }
        $$renderer2.push(`<!--]--></div></div>`);
      }
    } else {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`<div class="rounded-lg border border-dashed border-border py-12 text-center"><p class="text-sm text-text-secondary">No maps yet. Add your first map above.</p></div>`);
    }
    $$renderer2.push(`<!--]--></div></div>`);
  });
}

export { _page as default };
//# sourceMappingURL=_page.svelte-Be6BiSzg.js.map
