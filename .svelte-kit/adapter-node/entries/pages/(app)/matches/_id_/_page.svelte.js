import { e as escape_html, b as attr, s as stringify, c as attr_class, a as ensure_array_like, d as derived } from "../../../../../chunks/index3.js";
import "@sveltejs/kit/internal";
import "../../../../../chunks/url.js";
import "../../../../../chunks/utils.js";
import "@sveltejs/kit/internal/server";
import "../../../../../chunks/root.js";
import "../../../../../chunks/exports.js";
import "../../../../../chunks/state.svelte.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { data } = $$props;
    let m = derived(() => data.match);
    let p1 = derived(() => m().participants[0]);
    let p2 = derived(() => m().participants[1]);
    const config = derived(() => m().config);
    const winsNeeded = derived(() => Math.ceil(config().bestOf / 2));
    const playedSlotIds = derived(() => new Set(m().games.map((g) => g.mappoolSlotId)));
    const sortedByPick = derived(() => [...m().participants].sort((a, b) => (a.pickOrder ?? 99) - (b.pickOrder ?? 99)));
    const expectedPickerIdx = derived(() => m().games.length % sortedByPick().length);
    const expectedPicker = derived(() => sortedByPick()[expectedPickerIdx()]);
    const canRoll = derived(() => m().state === "ROLLING" && m().participants.some((p) => p.rollValue === null));
    const catColors = {
      NM: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      HD: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
      HR: "bg-red-500/20 text-red-400 border-red-500/30",
      DT: "bg-purple-500/20 text-purple-400 border-purple-500/30",
      FM: "bg-green-500/20 text-green-400 border-green-500/30",
      TB: "bg-pink-500/20 text-pink-400 border-pink-500/30"
    };
    const groupedSlots = derived(() => () => {
      if (!m().mappool?.slots) return {};
      const groups = {};
      for (const slot of m().mappool.slots) {
        if (!groups[slot.category]) groups[slot.category] = [];
        groups[slot.category].push(slot);
      }
      for (const cat of Object.keys(groups)) {
        groups[cat].sort((a, b) => a.orderInCategory - b.orderInCategory);
      }
      return groups;
    });
    let rolling = false;
    let picking = false;
    let forceStarting = false;
    function formatLength(seconds) {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, "0")}`;
    }
    function stateLabel(s) {
      return {
        CREATED: "Waiting",
        LOBBY: "In Lobby",
        ROLLING: "Rolling",
        PICKING: "Pick Phase",
        PLAYING: "Playing",
        FINISHED: "Finished",
        CANCELLED: "Cancelled"
      }[s] ?? s;
    }
    function stateBorder(s) {
      return {
        ROLLING: "border-yellow-500/30",
        PICKING: "border-blue-500/30",
        PLAYING: "border-green-500/30",
        FINISHED: "border-accent/30"
      }[s] ?? "border-border";
    }
    $$renderer2.push(`<div class="mx-auto max-w-5xl"><div class="flex items-center gap-3"><a href="/matches" class="text-text-secondary transition-colors hover:text-text-primary">←</a> <div class="flex-1"><h1 class="text-xl font-700 tracking-tight">${escape_html(m().name || "Match")}</h1> <p class="mt-0.5 text-xs text-text-secondary">Best of ${escape_html(config().bestOf)} · First to ${escape_html(winsNeeded())} `);
    if (m().osuLobbyId) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`· <a${attr("href", `https://osu.ppy.sh/mp/${stringify(m().osuLobbyId)}`)} target="_blank" class="text-accent hover:underline">osu! mp/${escape_html(m().osuLobbyId)}</a>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></p></div> <span${attr_class(`rounded border px-2.5 py-1 text-xs font-600 ${stringify(stateBorder(m().state))}`)}>${escape_html(stateLabel(m().state))}</span> `);
    if (!["FINISHED", "CANCELLED"].includes(m().state)) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<form method="post" action="?/cancel"><button type="submit" class="rounded-md border border-red-500/30 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10">Cancel</button></form>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></div> `);
    if (p1() && p2()) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="mt-6 flex items-center gap-4"><div${attr_class(`flex flex-1 items-center gap-4 rounded-lg border p-4 ${stringify(m().winnerId === p1().teamId ? "border-green-500/40 bg-green-500/5" : "border-border bg-surface-800")}`)}>`);
      if (p1().team.avatarUrl) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<img${attr("src", p1().team.avatarUrl)} alt="" class="h-10 w-10 rounded-full"/>`);
      } else {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]--> <div class="flex-1"><p class="text-sm font-600">${escape_html(p1().team.name)}</p> `);
      if (p1().rollValue != null) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<p class="text-xs text-text-secondary">Roll: ${escape_html(p1().rollValue)}${escape_html(p1().pickOrder === 1 ? " ★" : "")}</p>`);
      } else {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]--></div> <span${attr_class(`text-3xl font-800 tabular-nums ${stringify(p1().score >= winsNeeded() ? "text-green-400" : "text-text-primary")}`)}>${escape_html(p1().score)}</span></div> <span class="text-lg font-700 text-text-secondary">vs</span> <div${attr_class(`flex flex-1 items-center gap-4 rounded-lg border p-4 ${stringify(m().winnerId === p2().teamId ? "border-green-500/40 bg-green-500/5" : "border-border bg-surface-800")}`)}><span${attr_class(`text-3xl font-800 tabular-nums ${stringify(p2().score >= winsNeeded() ? "text-green-400" : "text-text-primary")}`)}>${escape_html(p2().score)}</span> <div class="flex-1 text-right"><p class="text-sm font-600">${escape_html(p2().team.name)}</p> `);
      if (p2().rollValue != null) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<p class="text-xs text-text-secondary">${escape_html(p2().pickOrder === 1 ? "★ " : "")}Roll: ${escape_html(p2().rollValue)}</p>`);
      } else {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]--></div> `);
      if (p2().team.avatarUrl) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<img${attr("src", p2().team.avatarUrl)} alt="" class="h-10 w-10 rounded-full"/>`);
      } else {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]--></div></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (["LOBBY", "ROLLING", "PICKING", "PLAYING"].includes(m().state)) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="mt-3 flex justify-center"><form method="post" action="?/reinvite"><button type="submit" class="rounded-md border border-border px-3 py-1.5 text-xs text-text-secondary transition-colors hover:border-accent/40 hover:text-accent">📨 Re-invite players to lobby</button></form></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (m().state === "ROLLING") {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"><div class="w-full max-w-md rounded-xl border border-yellow-500/30 bg-surface-800 p-8 text-center shadow-2xl"><h2 class="text-lg font-700">🎲 Roll Phase</h2> <p class="mt-2 text-sm text-text-secondary">Highest roll picks first</p> <div class="mt-6 flex justify-center gap-6"><!--[-->`);
      const each_array = ensure_array_like(m().participants);
      for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
        let p = each_array[$$index];
        $$renderer2.push(`<div class="rounded-lg border border-border bg-surface-700 px-6 py-4"><p class="text-xs text-text-secondary">${escape_html(p.team.name)}</p> `);
        if (p.rollValue != null) {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<p class="mt-1 text-2xl font-800 text-yellow-400">${escape_html(p.rollValue)}</p>`);
        } else {
          $$renderer2.push("<!--[!-->");
          $$renderer2.push(`<p class="mt-1 text-2xl font-800 text-text-secondary/30">—</p>`);
        }
        $$renderer2.push(`<!--]--></div>`);
      }
      $$renderer2.push(`<!--]--></div> `);
      if (canRoll()) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<form method="post" action="?/roll"><button type="submit"${attr("disabled", rolling, true)} class="mt-6 rounded-md bg-accent px-8 py-3 text-sm font-600 text-surface-900 transition-colors hover:bg-accent-hover disabled:opacity-50">${escape_html("🎲 Roll!")}</button></form> <p class="mt-3 text-xs text-text-secondary">or type <code class="rounded bg-surface-700 px-1.5 py-0.5 font-mono text-accent">!roll</code> in osu! chat</p>`);
      } else {
        $$renderer2.push("<!--[!-->");
        $$renderer2.push(`<p class="mt-6 text-sm text-text-secondary animate-pulse">Waiting for all rolls...</p>`);
      }
      $$renderer2.push(`<!--]--></div></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (m().state === "PICKING") {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"><div class="w-full max-w-3xl max-h-[80vh] overflow-y-auto rounded-xl border border-blue-500/30 bg-surface-800 p-6 shadow-2xl"><div class="text-center"><h2 class="text-lg font-700">🎯 Pick a Map</h2> <p class="mt-1 text-sm"><span class="font-600 text-accent">${escape_html(expectedPicker()?.team.name)}</span>'s turn to pick</p> <p class="mt-1 text-xs text-text-secondary">or type <code class="rounded bg-surface-700 px-1.5 py-0.5 font-mono text-accent">!pick NM1</code> in osu! chat</p></div> `);
      {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]--> <div class="mt-6 flex flex-col gap-4"><!--[-->`);
      const each_array_1 = ensure_array_like(Object.entries(groupedSlots()()));
      for (let $$index_2 = 0, $$length = each_array_1.length; $$index_2 < $$length; $$index_2++) {
        let [category, slots] = each_array_1[$$index_2];
        $$renderer2.push(`<div><span${attr_class(`mb-2 inline-block rounded border px-2 py-0.5 text-xs font-600 ${stringify(catColors[category] ?? "border-border")}`)}>${escape_html(category)}</span> <div class="grid grid-cols-1 gap-2 sm:grid-cols-2"><!--[-->`);
        const each_array_2 = ensure_array_like(slots);
        for (let i = 0, $$length2 = each_array_2.length; i < $$length2; i++) {
          let slot = each_array_2[i];
          const bm = data.beatmapCache[slot.beatmapId];
          const isPlayed = playedSlotIds().has(slot.id);
          $$renderer2.push(`<form method="post" action="?/pick"><input type="hidden" name="slotId"${attr("value", slot.id)}/> <button type="submit"${attr("disabled", isPlayed || picking, true)}${attr_class(`flex w-full items-center gap-3 rounded-lg border p-2 text-left transition-all ${stringify(isPlayed ? "border-border/50 bg-surface-900 opacity-30 cursor-not-allowed" : "border-border bg-surface-700 hover:border-accent hover:bg-surface-600 cursor-pointer")}`)}>`);
          if (bm?.listCoverUrl) {
            $$renderer2.push("<!--[-->");
            $$renderer2.push(`<img${attr("src", bm.listCoverUrl)} alt="" class="h-10 w-20 rounded object-cover"/>`);
          } else {
            $$renderer2.push("<!--[!-->");
            $$renderer2.push(`<div class="flex h-10 w-20 items-center justify-center rounded bg-surface-600 text-xs text-text-secondary">?</div>`);
          }
          $$renderer2.push(`<!--]--> <div class="min-w-0 flex-1">`);
          if (bm) {
            $$renderer2.push("<!--[-->");
            $$renderer2.push(`<p class="truncate text-xs font-500">${escape_html(bm.artist)} - ${escape_html(bm.title)}</p> <p class="text-xs text-text-secondary">[${escape_html(bm.version)}] · ★${escape_html(bm.starRating.toFixed(1))} · ${escape_html(bm.bpm)}bpm</p>`);
          } else {
            $$renderer2.push("<!--[!-->");
            $$renderer2.push(`<p class="text-xs text-text-secondary">#${escape_html(slot.beatmapId)}</p>`);
          }
          $$renderer2.push(`<!--]--></div> <span class="text-xs font-600 text-text-secondary">${escape_html(category)}${escape_html(slot.orderInCategory)}</span> `);
          if (isPlayed) {
            $$renderer2.push("<!--[-->");
            $$renderer2.push(`<span class="text-xs text-text-secondary">✓</span>`);
          } else {
            $$renderer2.push("<!--[!-->");
          }
          $$renderer2.push(`<!--]--></button></form>`);
        }
        $$renderer2.push(`<!--]--></div></div>`);
      }
      $$renderer2.push(`<!--]--></div></div></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (m().state === "PLAYING") {
      $$renderer2.push("<!--[-->");
      const currentGame = m().games[m().games.length - 1];
      const bm = currentGame ? data.beatmapCache[currentGame.slot?.beatmapId] : null;
      $$renderer2.push(`<div class="mt-6 rounded-lg border border-green-500/30 bg-green-500/5 p-5 text-center"><div class="flex items-center justify-center gap-2"><div class="relative h-3 w-3"><div class="absolute inset-0 animate-ping rounded-full bg-green-400 opacity-75"></div> <div class="relative h-3 w-3 rounded-full bg-green-400"></div></div> <span class="text-sm font-600 text-green-400">Now Playing</span></div> `);
      if (bm) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<p class="mt-2 text-sm">${escape_html(bm.artist)} - ${escape_html(bm.title)} <span class="text-text-secondary">[${escape_html(bm.version)}]</span></p> <p class="mt-1 text-xs text-text-secondary">★${escape_html(bm.starRating.toFixed(1))} · ${escape_html(bm.bpm)}bpm · ${escape_html(formatLength(bm.totalLength))}</p>`);
      } else {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]--> <p class="mt-3 text-xs text-text-secondary animate-pulse">Waiting for players to ready up &amp; play in osu!...</p> <form method="post" action="?/forceStart"><button type="submit"${attr("disabled", forceStarting, true)} class="mt-4 rounded-md border border-yellow-500/30 px-4 py-2 text-xs font-600 text-yellow-400 transition-colors hover:bg-yellow-500/10 disabled:opacity-50">${escape_html("Force Start (skip ready)")}</button></form></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (m().state === "FINISHED") {
      $$renderer2.push("<!--[-->");
      const winner = m().participants.find((p) => p.teamId === m().winnerId);
      $$renderer2.push(`<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"><div class="w-full max-w-md rounded-xl border border-accent/30 bg-surface-800 p-8 text-center shadow-2xl"><div class="text-4xl">🏆</div> <h2 class="mt-4 text-2xl font-800"><span class="text-accent">${escape_html(winner?.team.name)}</span> wins!</h2> <p class="mt-2 text-lg font-700 tabular-nums text-text-secondary">${escape_html(p1()?.score)} – ${escape_html(p2()?.score)}</p> <div class="mt-6 flex flex-col gap-1"><!--[-->`);
      const each_array_3 = ensure_array_like(m().games);
      for (let $$index_3 = 0, $$length = each_array_3.length; $$index_3 < $$length; $$index_3++) {
        let game = each_array_3[$$index_3];
        const bm = data.beatmapCache[game.slot?.beatmapId];
        const winnerP = m().participants.find((p) => p.id === game.winnerParticipantId);
        $$renderer2.push(`<div class="flex items-center gap-2 rounded bg-surface-700 px-3 py-1.5 text-xs"><span${attr_class(`font-600 ${stringify(catColors[game.slot?.category]?.split(" ")[1] ?? "text-text-secondary")}`)}>${escape_html(game.slot?.category)}${escape_html(game.slot?.orderInCategory)}</span> <span class="flex-1 truncate text-text-secondary">${escape_html(bm ? `${bm.artist} - ${bm.title}` : `#${game.slot?.beatmapId}`)}</span> <span${attr_class(`font-600 ${stringify(winnerP?.id === p1()?.id ? "text-blue-400" : "text-red-400")}`)}>${escape_html(winnerP?.team.name)}</span></div>`);
      }
      $$renderer2.push(`<!--]--></div> <a href="/" class="mt-6 inline-block rounded-md bg-accent px-6 py-2.5 text-sm font-600 text-surface-900 transition-colors hover:bg-accent-hover">Back to Dashboard</a></div></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (m().games.length > 0) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="mt-6"><h2 class="text-sm font-600">Games Played</h2> <div class="mt-3 flex flex-col gap-2"><!--[-->`);
      const each_array_4 = ensure_array_like(m().games);
      for (let $$index_4 = 0, $$length = each_array_4.length; $$index_4 < $$length; $$index_4++) {
        let game = each_array_4[$$index_4];
        const bm = data.beatmapCache[game.slot?.beatmapId];
        const pickerTeam = m().participants.find((p) => p.id === game.pickedByParticipantId)?.team;
        const winnerTeam = m().participants.find((p) => p.id === game.winnerParticipantId)?.team;
        $$renderer2.push(`<div class="flex items-center gap-3 rounded-lg border border-border bg-surface-800 p-3"><span class="w-6 text-center text-xs font-600 text-text-secondary">${escape_html(game.gameNumber)}</span> `);
        if (bm?.listCoverUrl) {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<img${attr("src", bm.listCoverUrl)} alt="" class="h-8 w-16 rounded object-cover"/>`);
        } else {
          $$renderer2.push("<!--[!-->");
        }
        $$renderer2.push(`<!--]--> <div class="min-w-0 flex-1">`);
        if (bm) {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<p class="truncate text-sm font-500">${escape_html(bm.artist)} - ${escape_html(bm.title)} <span class="text-text-secondary">[${escape_html(bm.version)}]</span></p>`);
        } else {
          $$renderer2.push("<!--[!-->");
        }
        $$renderer2.push(`<!--]--> <div class="flex items-center gap-2 text-xs text-text-secondary"><span${attr_class(`rounded border px-1.5 py-0.5 ${stringify(catColors[game.slot?.category] ?? "border-border")}`)}>${escape_html(game.slot?.category)}${escape_html(game.slot?.orderInCategory)}</span> `);
        if (pickerTeam) {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<span>Picked by ${escape_html(pickerTeam.name)}</span>`);
        } else {
          $$renderer2.push("<!--[!-->");
        }
        $$renderer2.push(`<!--]--></div></div> `);
        if (game.state === "FINISHED" && p1() && p2()) {
          $$renderer2.push("<!--[-->");
          const p1Score = game.scores.filter((s) => s.player?.participantId === p1().id).reduce((sum, s) => sum + s.score, 0);
          const p2Score = game.scores.filter((s) => s.player?.participantId === p2().id).reduce((sum, s) => sum + s.score, 0);
          $$renderer2.push(`<div class="flex items-center gap-2 font-mono text-sm tabular-nums"><span${attr_class(p1Score > p2Score ? "font-700 text-green-400" : "text-text-secondary")}>${escape_html(p1Score.toLocaleString())}</span> <span class="text-text-secondary">-</span> <span${attr_class(p2Score > p1Score ? "font-700 text-green-400" : "text-text-secondary")}>${escape_html(p2Score.toLocaleString())}</span></div>`);
        } else if (game.state === "PLAYING") {
          $$renderer2.push("<!--[1-->");
          $$renderer2.push(`<span class="text-xs text-green-400 animate-pulse">Live</span>`);
        } else {
          $$renderer2.push("<!--[!-->");
        }
        $$renderer2.push(`<!--]--> `);
        if (winnerTeam) {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<span class="text-xs text-green-400">✓ ${escape_html(winnerTeam.name)}</span>`);
        } else {
          $$renderer2.push("<!--[!-->");
        }
        $$renderer2.push(`<!--]--></div>`);
      }
      $$renderer2.push(`<!--]--></div></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (m().state === "CREATED") {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="mt-6 rounded-lg border border-border bg-surface-800 p-6 text-center"><p class="text-sm text-text-secondary animate-pulse">Creating osu! lobby...</p></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (m().state === "LOBBY") {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="mt-6 rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-6 text-center"><p class="text-sm text-text-secondary">Lobby created. Waiting for players to join...</p> `);
      if (m().osuLobbyId) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<p class="mt-2 text-xs text-text-secondary"><a${attr("href", `https://osu.ppy.sh/mp/${stringify(m().osuLobbyId)}`)} target="_blank" class="text-accent hover:underline">osu! mp/${escape_html(m().osuLobbyId)}</a></p>`);
      } else {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]--></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (m().state === "CANCELLED") {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="mt-6 rounded-lg border border-red-500/30 bg-red-500/5 p-6 text-center"><p class="text-sm text-red-400">This match was cancelled.</p></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></div>`);
  });
}
export {
  _page as default
};
