import { a9 as attr, a6 as escape_html, aa as attr_class, ab as stringify, a1 as derived } from './index3-C4geC3K_.js';
import './root-D12ma0No.js';
import './utils-D_bK1W85.js';
import './exports-B5ORJhfK.js';
import './state.svelte-DvHRBIfo.js';

function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { data } = $$props;
    const roleBadge = {
      player: { label: "Player", color: "bg-surface-600 text-text-secondary" },
      referee: { label: "Referee", color: "bg-yellow-500/20 text-yellow-400" },
      admin: { label: "Admin", color: "bg-red-500/20 text-red-400" }
    };
    const badge = derived(() => roleBadge[data.profile.role] ?? roleBadge.player);
    const winRate = derived(() => data.rating.wins + data.rating.losses > 0 ? (data.rating.wins / (data.rating.wins + data.rating.losses) * 100).toFixed(1) : "—");
    $$renderer2.push(`<div class="mx-auto max-w-2xl"><h1 class="text-2xl font-700 tracking-tight">Settings</h1> <p class="mt-1 text-sm text-text-secondary">Your profile and account settings</p> <div class="mt-6 rounded-lg border border-border bg-surface-800 p-6"><div class="flex items-center gap-4">`);
    if (data.profile.image) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<img${attr("src", data.profile.image)}${attr("alt", data.profile.name)} class="h-16 w-16 rounded-full"/>`);
    } else {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`<div class="flex h-16 w-16 items-center justify-center rounded-full bg-surface-600 text-xl font-700 text-text-secondary">${escape_html(data.profile.name.charAt(0).toUpperCase())}</div>`);
    }
    $$renderer2.push(`<!--]--> <div class="flex-1"><div class="flex items-center gap-2"><h2 class="text-lg font-700">${escape_html(data.profile.name)}</h2> <span${attr_class(`rounded px-2 py-0.5 text-xs font-600 ${stringify(badge().color)}`)}>${escape_html(badge().label)}</span></div> <p class="mt-0.5 text-sm text-text-secondary">${escape_html(data.profile.email)}</p></div></div> <div class="mt-6 border-t border-border pt-4"><h3 class="text-xs font-600 text-text-secondary uppercase tracking-wider">Connected Accounts</h3> <div class="mt-3 flex items-center gap-3 rounded-md bg-surface-700 px-4 py-3"><span class="text-lg">🎮</span> <div class="flex-1"><p class="text-sm font-500">osu!</p> <p class="text-xs text-text-secondary">`);
    if (data.hasOsuLinked) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`Connected as ${escape_html(data.profile.name)}`);
    } else {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`Not connected`);
    }
    $$renderer2.push(`<!--]--></p></div> `);
    if (data.hasOsuLinked) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<span class="rounded bg-green-500/20 px-2 py-0.5 text-xs font-500 text-green-400">Linked</span>`);
    } else {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`<a href="/api/auth/osu/login" class="rounded bg-accent px-3 py-1 text-xs font-600 text-surface-900 hover:bg-accent-hover">Connect</a>`);
    }
    $$renderer2.push(`<!--]--></div></div></div> <div class="mt-4 rounded-lg border border-border bg-surface-800 p-6"><h3 class="text-xs font-600 text-text-secondary uppercase tracking-wider">Ranked Stats</h3> <div class="mt-4 grid grid-cols-4 gap-4"><div><p class="text-2xl font-800 tabular-nums text-accent">${escape_html(data.rating.elo)}</p> <p class="mt-1 text-xs text-text-secondary">ELO Rating</p></div> <div><p class="text-2xl font-800 tabular-nums text-green-400">${escape_html(data.rating.wins)}</p> <p class="mt-1 text-xs text-text-secondary">Wins</p></div> <div><p class="text-2xl font-800 tabular-nums text-red-400">${escape_html(data.rating.losses)}</p> <p class="mt-1 text-xs text-text-secondary">Losses</p></div> <div><p class="text-2xl font-800 tabular-nums text-text-primary">${escape_html(winRate())}${escape_html(winRate() !== "—" ? "%" : "")}</p> <p class="mt-1 text-xs text-text-secondary">Win Rate</p></div></div></div> <div class="mt-4 rounded-lg border border-border bg-surface-800 p-6"><h3 class="text-xs font-600 text-red-400 uppercase tracking-wider">Account</h3> <div class="mt-4"><form method="post" action="?/logout"><button type="submit" class="rounded-md border border-red-500/30 px-4 py-2 text-sm font-500 text-red-400 transition-colors hover:bg-red-500/10">Sign Out</button></form></div></div></div>`);
  });
}

export { _page as default };
//# sourceMappingURL=_page.svelte-D23V0tpa.js.map
