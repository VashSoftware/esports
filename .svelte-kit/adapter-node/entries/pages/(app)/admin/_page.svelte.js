import { e as escape_html, a as ensure_array_like, b as attr, s as stringify } from "../../../../chunks/index3.js";
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
    const roleBadge = {
      player: {
        label: "Player",
        color: "bg-surface-600 text-text-secondary border-border"
      },
      referee: {
        label: "Referee",
        color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
      },
      admin: {
        label: "Admin",
        color: "bg-red-500/20 text-red-400 border-red-500/30"
      }
    };
    $$renderer2.push(`<div class="mx-auto max-w-4xl"><div><h1 class="text-2xl font-700 tracking-tight">Admin Panel</h1> <p class="mt-1 text-sm text-text-secondary">${escape_html(data.users.length)} registered user${escape_html(data.users.length !== 1 ? "s" : "")}</p></div> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> <div class="mt-6 rounded-lg border border-border bg-surface-800"><div class="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 border-b border-border px-4 py-3"><span class="text-xs font-600 text-text-secondary">Avatar</span> <span class="text-xs font-600 text-text-secondary">User</span> <span class="text-xs font-600 text-text-secondary">ELO</span> <span class="text-xs font-600 text-text-secondary">W/L</span> <span class="text-xs font-600 text-text-secondary">Role</span></div> <!--[-->`);
    const each_array = ensure_array_like(data.users);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let u = each_array[$$index];
      const badge = roleBadge[u.role] ?? roleBadge.player;
      $$renderer2.push(`<div class="grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-4 border-b border-border/50 px-4 py-3 last:border-b-0">`);
      if (u.image) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<img${attr("src", u.image)} alt="" class="h-8 w-8 rounded-full"/>`);
      } else {
        $$renderer2.push("<!--[!-->");
        $$renderer2.push(`<div class="flex h-8 w-8 items-center justify-center rounded-full bg-surface-600 text-xs font-700 text-text-secondary">${escape_html(u.name.charAt(0).toUpperCase())}</div>`);
      }
      $$renderer2.push(`<!--]--> <div class="min-w-0"><p class="truncate text-sm font-500">${escape_html(u.name)}</p> <p class="truncate text-xs text-text-secondary">${escape_html(u.email)}</p></div> <span class="text-sm font-600 tabular-nums text-text-primary">${escape_html(u.elo)}</span> <span class="text-xs tabular-nums text-text-secondary"><span class="text-green-400">${escape_html(u.wins)}W</span> / <span class="text-red-400">${escape_html(u.losses)}L</span></span> <form method="post" action="?/setRole" class="flex items-center gap-2"><input type="hidden" name="userId"${attr("value", u.id)}/> `);
      $$renderer2.select(
        {
          name: "role",
          value: u.role,
          onchange: (e) => e.currentTarget.form?.requestSubmit(),
          class: `rounded-md border px-2 py-1 text-xs font-500 ${stringify(badge.color)} cursor-pointer bg-transparent focus:outline-none`
        },
        ($$renderer3) => {
          $$renderer3.option({ value: "player", class: "bg-surface-800 text-text-primary" }, ($$renderer4) => {
            $$renderer4.push(`Player`);
          });
          $$renderer3.option({ value: "referee", class: "bg-surface-800 text-text-primary" }, ($$renderer4) => {
            $$renderer4.push(`Referee`);
          });
          $$renderer3.option({ value: "admin", class: "bg-surface-800 text-text-primary" }, ($$renderer4) => {
            $$renderer4.push(`Admin`);
          });
        }
      );
      $$renderer2.push(`</form></div>`);
    }
    $$renderer2.push(`<!--]--></div></div>`);
  });
}
export {
  _page as default
};
