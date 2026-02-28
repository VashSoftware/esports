import { e as escape_html, a as ensure_array_like, b as attr, s as stringify, c as attr_class } from "../../../chunks/index3.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { data } = $$props;
    const stateConfig = {
      CREATED: { label: "Created", color: "text-text-secondary" },
      LOBBY: { label: "In Lobby", color: "text-yellow-400" },
      ROLLING: {
        label: "Rolling",
        color: "text-yellow-400",
        dot: "bg-yellow-400"
      },
      PICKING: { label: "Picking", color: "text-blue-400", dot: "bg-blue-400" },
      PLAYING: { label: "Live", color: "text-green-400", dot: "bg-green-400" },
      FINISHED: { label: "Finished", color: "text-text-secondary" },
      CANCELLED: { label: "Cancelled", color: "text-red-400" }
    };
    let queueLoading = false;
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
    if (!data.user) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="flex min-h-[70vh] flex-col items-center justify-center text-center"><div class="font-800 mb-6 flex h-16 w-16 items-center justify-center rounded-xl bg-accent text-2xl text-surface-900">V</div> <h1 class="text-4xl font-800 tracking-tight">Welcome to <span class="text-accent">Vash Esports</span></h1> <p class="mt-3 max-w-md text-text-secondary">Automated tournament match management for osu! — lobbies, mappools, picks, bans, and
			ELO tracking all in one place.</p> <a href="/login" class="font-600 mt-8 rounded-lg bg-accent px-6 py-3 text-surface-900 transition-colors hover:bg-accent-hover">Sign in with osu!</a> <p class="mt-4 text-xs text-text-secondary">Uses your osu! account. No extra registration needed.</p></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`<div class="mx-auto max-w-5xl"><div><h1 class="text-2xl font-700 tracking-tight">Welcome back, <span class="text-accent">${escape_html(data.user.name)}</span></h1> <p class="mt-1 text-sm text-text-secondary">Automated esports match management for osu!</p></div> <div class="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4"><div class="rounded-lg border border-border bg-surface-800 p-4"><p class="text-2xl font-800 tabular-nums text-text-primary">${escape_html(data.stats.matches)}</p> <p class="mt-1 text-xs text-text-secondary">Total Matches</p></div> <div class="rounded-lg border border-border bg-surface-800 p-4"><p class="text-2xl font-800 tabular-nums text-green-400">${escape_html(data.stats.finished)}</p> <p class="mt-1 text-xs text-text-secondary">Completed</p></div> <div class="rounded-lg border border-border bg-surface-800 p-4"><p class="text-2xl font-800 tabular-nums text-text-primary">${escape_html(data.stats.teams)}</p> <p class="mt-1 text-xs text-text-secondary">Teams</p></div> <div class="rounded-lg border border-border bg-surface-800 p-4"><p class="text-2xl font-800 tabular-nums text-text-primary">${escape_html(data.stats.mappools)}</p> <p class="mt-1 text-xs text-text-secondary">Mappools</p></div></div> `);
      if (data.liveMatches.length > 0) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<div class="mt-8"><div class="flex items-center gap-2"><div class="relative h-2 w-2"><div class="absolute inset-0 animate-ping rounded-full bg-green-400 opacity-75"></div> <div class="relative h-2 w-2 rounded-full bg-green-400"></div></div> <h2 class="text-sm font-600">Live Now</h2></div> <div class="mt-3 flex flex-col gap-2"><!--[-->`);
        const each_array = ensure_array_like(data.liveMatches);
        for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
          let m = each_array[$$index];
          const p1 = m.participants[0];
          const p2 = m.participants[1];
          const sc = stateConfig[m.state];
          $$renderer2.push(`<a${attr("href", `/matches/${stringify(m.id)}`)} class="flex items-center gap-4 rounded-lg border border-green-500/20 bg-surface-800 p-4 transition-all hover:border-green-500/40 hover:bg-surface-700"><div class="flex flex-1 items-center gap-3">`);
          if (p1?.team.avatarUrl) {
            $$renderer2.push("<!--[-->");
            $$renderer2.push(`<img${attr("src", p1.team.avatarUrl)} alt="" class="h-8 w-8 rounded-full"/>`);
          } else {
            $$renderer2.push("<!--[!-->");
          }
          $$renderer2.push(`<!--]--> <span class="text-sm font-600">${escape_html(p1?.team.name ?? "?")}</span></div> <div class="flex items-center gap-3"><span class="text-xl font-800 tabular-nums">${escape_html(p1?.score ?? 0)}</span> <span class="text-xs text-text-secondary">vs</span> <span class="text-xl font-800 tabular-nums">${escape_html(p2?.score ?? 0)}</span></div> <div class="flex flex-1 items-center justify-end gap-3"><span class="text-sm font-600">${escape_html(p2?.team.name ?? "?")}</span> `);
          if (p2?.team.avatarUrl) {
            $$renderer2.push("<!--[-->");
            $$renderer2.push(`<img${attr("src", p2.team.avatarUrl)} alt="" class="h-8 w-8 rounded-full"/>`);
          } else {
            $$renderer2.push("<!--[!-->");
          }
          $$renderer2.push(`<!--]--></div> <span${attr_class(`flex items-center gap-1.5 text-xs font-500 ${stringify(sc?.color ?? "")}`)}>`);
          if (sc?.dot) {
            $$renderer2.push("<!--[-->");
            $$renderer2.push(`<span${attr_class(`h-1.5 w-1.5 rounded-full ${stringify(sc.dot)}`)}></span>`);
          } else {
            $$renderer2.push("<!--[!-->");
          }
          $$renderer2.push(`<!--]--> ${escape_html(sc?.label)}</span></a>`);
        }
        $$renderer2.push(`<!--]--></div></div>`);
      } else {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]--> <div class="mt-6 rounded-lg border border-border bg-surface-800 p-5"><div class="flex items-center justify-between"><div><h2 class="text-sm font-600">Ranked Queue</h2> <p class="mt-0.5 text-xs text-text-secondary">Find a match at your skill level</p></div> `);
      {
        $$renderer2.push("<!--[!-->");
        $$renderer2.push(`<button${attr("disabled", queueLoading, true)} class="rounded-md bg-accent px-4 py-2 text-sm font-600 text-surface-900 transition-colors hover:bg-accent-hover disabled:opacity-50">${escape_html("Find Match")}</button>`);
      }
      $$renderer2.push(`<!--]--></div></div> <div class="mt-8 grid gap-4 lg:grid-cols-3"><div class="lg:col-span-1"><h2 class="text-sm font-600">Quick Actions</h2> <div class="mt-3 flex flex-col gap-2"><a href="/matches" class="flex items-center gap-3 rounded-lg border border-border bg-surface-800 p-3 transition-colors hover:border-accent/40 hover:bg-surface-700"><span class="flex h-8 w-8 items-center justify-center rounded-md bg-accent/10 text-accent">⚔</span> <div><p class="text-sm font-600">New Match</p> <p class="text-xs text-text-secondary">Start a 1v1</p></div></a> <a href="/mappools" class="flex items-center gap-3 rounded-lg border border-border bg-surface-800 p-3 transition-colors hover:border-accent/40 hover:bg-surface-700"><span class="flex h-8 w-8 items-center justify-center rounded-md bg-purple-500/10 text-purple-400">♫</span> <div><p class="text-sm font-600">Mappools</p> <p class="text-xs text-text-secondary">Build a pool</p></div></a> <a href="/teams" class="flex items-center gap-3 rounded-lg border border-border bg-surface-800 p-3 transition-colors hover:border-accent/40 hover:bg-surface-700"><span class="flex h-8 w-8 items-center justify-center rounded-md bg-blue-500/10 text-blue-400">⚑</span> <div><p class="text-sm font-600">Teams</p> <p class="text-xs text-text-secondary">Manage rosters</p></div></a></div></div> <div class="lg:col-span-2"><h2 class="text-sm font-600">Recent Matches</h2> <div class="mt-3 flex flex-col gap-2">`);
      const each_array_1 = ensure_array_like(data.recentMatches);
      if (each_array_1.length !== 0) {
        $$renderer2.push("<!--[-->");
        for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
          let m = each_array_1[$$index_1];
          const p1 = m.participants[0];
          const p2 = m.participants[1];
          const config = m.config;
          const sc = stateConfig[m.state];
          $$renderer2.push(`<a${attr("href", `/matches/${stringify(m.id)}`)} class="flex items-center gap-3 rounded-lg border border-border bg-surface-800 p-3 transition-colors hover:border-accent/30 hover:bg-surface-700"><div class="min-w-0 flex-1"><div class="flex items-center gap-2"><span class="text-sm font-600">${escape_html(p1?.team.name ?? "?")}</span> `);
          if (m.state === "FINISHED") {
            $$renderer2.push("<!--[-->");
            $$renderer2.push(`<span${attr_class(`text-xs font-700 tabular-nums ${stringify((p1?.score ?? 0) > (p2?.score ?? 0) ? "text-green-400" : "text-text-secondary")}`)}>${escape_html(p1?.score ?? 0)}</span> <span class="text-xs text-text-secondary">-</span> <span${attr_class(`text-xs font-700 tabular-nums ${stringify((p2?.score ?? 0) > (p1?.score ?? 0) ? "text-green-400" : "text-text-secondary")}`)}>${escape_html(p2?.score ?? 0)}</span>`);
          } else {
            $$renderer2.push("<!--[!-->");
            $$renderer2.push(`<span class="text-xs text-text-secondary">vs</span>`);
          }
          $$renderer2.push(`<!--]--> <span class="text-sm font-600">${escape_html(p2?.team.name ?? "?")}</span></div> <p class="mt-0.5 text-xs text-text-secondary">${escape_html(m.name ? `${m.name} · ` : "")}BO${escape_html(config.bestOf)}
									· ${escape_html(timeAgo(m.finishedAt ?? m.createdAt))}</p></div> `);
          if (m.state === "FINISHED" && m.winnerId) {
            $$renderer2.push("<!--[-->");
            const winner = m.participants.find((p) => p.teamId === m.winnerId);
            $$renderer2.push(`<span class="text-xs text-green-400">🏆 ${escape_html(winner?.team.name)}</span>`);
          } else {
            $$renderer2.push("<!--[!-->");
          }
          $$renderer2.push(`<!--]--> <span${attr_class(`text-xs ${stringify(sc?.color ?? "text-text-secondary")}`)}>${escape_html(sc?.label)}</span></a>`);
        }
      } else {
        $$renderer2.push("<!--[!-->");
        $$renderer2.push(`<div class="rounded-lg border border-dashed border-border py-8 text-center"><p class="text-sm text-text-secondary">No matches yet. <a href="/matches" class="text-accent hover:underline">Create one</a></p></div>`);
      }
      $$renderer2.push(`<!--]--></div></div></div></div>`);
    }
    $$renderer2.push(`<!--]-->`);
  });
}
export {
  _page as default
};
