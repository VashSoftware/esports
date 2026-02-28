import { e as escape_html, a as ensure_array_like, b as attr, s as stringify, c as attr_class, d as derived } from "../../../../chunks/index3.js";
import "@sveltejs/kit/internal";
import "../../../../chunks/url.js";
import "../../../../chunks/utils.js";
import "@sveltejs/kit/internal/server";
import "../../../../chunks/root.js";
import "../../../../chunks/exports.js";
import "../../../../chunks/state.svelte.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { data } = $$props;
    const stateConfig = {
      CREATED: { label: "Created", color: "text-text-secondary border-border" },
      LOBBY: {
        label: "In Lobby",
        color: "text-yellow-400 border-yellow-500/30"
      },
      ROLLING: {
        label: "Rolling",
        color: "text-yellow-400 border-yellow-500/30",
        dot: "bg-yellow-400"
      },
      PICKING: {
        label: "Picking",
        color: "text-blue-400 border-blue-500/30",
        dot: "bg-blue-400"
      },
      PLAYING: {
        label: "Live",
        color: "text-green-400 border-green-500/30",
        dot: "bg-green-400"
      },
      FINISHED: {
        label: "Finished",
        color: "text-text-secondary border-border"
      },
      CANCELLED: { label: "Cancelled", color: "text-red-400 border-red-500/30" }
    };
    const liveStates = ["LOBBY", "ROLLING", "PICKING", "PLAYING"];
    const liveMatches = derived(() => data.matches.filter((m) => liveStates.includes(m.state)));
    const recentMatches = derived(() => data.matches.filter((m) => !liveStates.includes(m.state)));
    function teamDisplay(m) {
      const p1 = m.participants[0];
      const p2 = m.participants[1];
      return { p1, p2 };
    }
    function timeAgo(date) {
      const d = new Date(date);
      const diff = Date.now() - d.getTime();
      const mins = Math.floor(diff / 6e4);
      if (mins < 1) return "just now";
      if (mins < 60) return `${mins}m ago`;
      const hours = Math.floor(mins / 60);
      if (hours < 24) return `${hours}h ago`;
      const days = Math.floor(hours / 24);
      return `${days}d ago`;
    }
    $$renderer2.push(`<div class="mx-auto max-w-5xl"><div class="flex items-center justify-between"><div><h1 class="text-2xl font-700 tracking-tight">Matches</h1> <p class="mt-1 text-sm text-text-secondary">${escape_html(data.matches.length)} match${escape_html(data.matches.length !== 1 ? "es" : "")} `);
    if (liveMatches().length > 0) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`· <span class="text-green-400">${escape_html(liveMatches().length)} live</span>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></p></div> <button class="rounded-md bg-accent px-4 py-2 text-sm font-600 text-surface-900 transition-colors hover:bg-accent-hover">${escape_html("New Match")}</button></div> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (liveMatches().length > 0) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="mt-6"><h2 class="flex items-center gap-2 text-sm font-600"><div class="relative h-2 w-2"><div class="absolute inset-0 animate-ping rounded-full bg-green-400 opacity-75"></div> <div class="relative h-2 w-2 rounded-full bg-green-400"></div></div> Live Now</h2> <div class="mt-3 flex flex-col gap-2"><!--[-->`);
      const each_array_4 = ensure_array_like(liveMatches());
      for (let $$index_4 = 0, $$length = each_array_4.length; $$index_4 < $$length; $$index_4++) {
        let m = each_array_4[$$index_4];
        const { p1, p2 } = teamDisplay(m);
        const sc = stateConfig[m.state];
        $$renderer2.push(`<a${attr("href", `/matches/${stringify(m.id)}`)} class="group flex items-center gap-4 rounded-lg border border-green-500/20 bg-surface-800 p-4 transition-all hover:border-green-500/40 hover:bg-surface-700"><div class="flex flex-1 items-center gap-3">`);
        if (p1?.team.avatarUrl) {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<img${attr("src", p1.team.avatarUrl)} alt="" class="h-8 w-8 rounded-full"/>`);
        } else {
          $$renderer2.push("<!--[!-->");
        }
        $$renderer2.push(`<!--]--> <span class="text-sm font-600">${escape_html(p1?.team.name ?? "?")}</span></div> <div class="flex items-center gap-3"><span class="text-xl font-800 tabular-nums">${escape_html(p1?.score ?? 0)}</span> <span class="text-xs font-600 text-text-secondary">vs</span> <span class="text-xl font-800 tabular-nums">${escape_html(p2?.score ?? 0)}</span></div> <div class="flex flex-1 items-center justify-end gap-3"><span class="text-sm font-600">${escape_html(p2?.team.name ?? "?")}</span> `);
        if (p2?.team.avatarUrl) {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<img${attr("src", p2.team.avatarUrl)} alt="" class="h-8 w-8 rounded-full"/>`);
        } else {
          $$renderer2.push("<!--[!-->");
        }
        $$renderer2.push(`<!--]--></div> <span${attr_class(`flex items-center gap-1.5 rounded border px-2 py-0.5 text-xs font-500 ${stringify(sc?.color ?? "border-border")}`)}>`);
        if (sc?.dot) {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<span${attr_class(`h-1.5 w-1.5 rounded-full ${stringify(sc.dot)}`)}></span>`);
        } else {
          $$renderer2.push("<!--[!-->");
        }
        $$renderer2.push(`<!--]--> ${escape_html(sc?.label ?? m.state)}</span></a>`);
      }
      $$renderer2.push(`<!--]--></div></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> <div class="mt-6">`);
    if (liveMatches().length > 0) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<h2 class="text-sm font-600 text-text-secondary">Past Matches</h2>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> <div class="mt-3 flex flex-col gap-2">`);
    const each_array_5 = ensure_array_like(recentMatches());
    if (each_array_5.length !== 0) {
      $$renderer2.push("<!--[-->");
      for (let $$index_5 = 0, $$length = each_array_5.length; $$index_5 < $$length; $$index_5++) {
        let m = each_array_5[$$index_5];
        const { p1, p2 } = teamDisplay(m);
        const config = m.config;
        const sc = stateConfig[m.state];
        $$renderer2.push(`<a${attr("href", `/matches/${stringify(m.id)}`)} class="group flex items-center gap-4 rounded-lg border border-border bg-surface-800 p-3 transition-colors hover:border-accent/30 hover:bg-surface-700"><div class="min-w-0 flex-1"><div class="flex items-center gap-2"><span class="text-sm font-600">${escape_html(p1?.team.name ?? "?")}</span> `);
        if (m.state === "FINISHED") {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<span${attr_class(`text-xs font-700 tabular-nums ${stringify((p1?.score ?? 0) > (p2?.score ?? 0) ? "text-green-400" : "text-text-secondary")}`)}>${escape_html(p1?.score ?? 0)}</span> <span class="text-xs text-text-secondary">-</span> <span${attr_class(`text-xs font-700 tabular-nums ${stringify((p2?.score ?? 0) > (p1?.score ?? 0) ? "text-green-400" : "text-text-secondary")}`)}>${escape_html(p2?.score ?? 0)}</span>`);
        } else {
          $$renderer2.push("<!--[!-->");
          $$renderer2.push(`<span class="text-xs text-text-secondary">vs</span>`);
        }
        $$renderer2.push(`<!--]--> <span class="text-sm font-600">${escape_html(p2?.team.name ?? "?")}</span></div> <p class="mt-0.5 text-xs text-text-secondary">${escape_html(m.name ? `${m.name} · ` : "")}BO${escape_html(config.bestOf)} `);
        if (m.finishedAt) {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`· ${escape_html(timeAgo(m.finishedAt))}`);
        } else if (m.createdAt) {
          $$renderer2.push("<!--[1-->");
          $$renderer2.push(`· ${escape_html(timeAgo(m.createdAt))}`);
        } else {
          $$renderer2.push("<!--[!-->");
        }
        $$renderer2.push(`<!--]--></p></div> `);
        if (m.state === "FINISHED" && m.winnerId) {
          $$renderer2.push("<!--[-->");
          const winner = m.participants.find((p) => p.teamId === m.winnerId);
          $$renderer2.push(`<span class="text-xs font-500 text-green-400">🏆 ${escape_html(winner?.team.name)}</span>`);
        } else {
          $$renderer2.push("<!--[!-->");
        }
        $$renderer2.push(`<!--]--> <span${attr_class(`rounded border px-2 py-0.5 text-xs font-500 ${stringify(sc?.color ?? "border-border")}`)}>${escape_html(sc?.label ?? m.state)}</span></a>`);
      }
    } else {
      $$renderer2.push("<!--[!-->");
      if (liveMatches().length === 0) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<div class="rounded-lg border border-dashed border-border py-12 text-center"><p class="text-sm text-text-secondary">No matches yet. Create one to get started.</p></div>`);
      } else {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]-->`);
    }
    $$renderer2.push(`<!--]--></div></div></div>`);
  });
}
export {
  _page as default
};
