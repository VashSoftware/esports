import { a6 as escape_html, a8 as ensure_array_like, a9 as attr, aa as attr_class, ab as stringify, a1 as derived } from './index3-C4geC3K_.js';
import './root-D12ma0No.js';
import './utils-D_bK1W85.js';
import './exports-B5ORJhfK.js';
import './state.svelte-DvHRBIfo.js';

function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { data } = $$props;
    let expandedTeam = null;
    let addingMemberTo = null;
    let memberUsername = "";
    const myTeams = derived(() => data.teams.filter((t) => t.members.some((m) => m.userId === data.userId)));
    const otherTeams = derived(() => data.teams.filter((t) => !t.members.some((m) => m.userId === data.userId)));
    function isOwner(t) {
      return t.ownerId === data.userId;
    }
    $$renderer2.push(`<div class="mx-auto max-w-4xl"><div class="flex items-center justify-between"><div><h1 class="text-2xl font-700 tracking-tight">Teams</h1> <p class="mt-1 text-sm text-text-secondary">${escape_html(data.teams.length)} team${escape_html(data.teams.length !== 1 ? "s" : "")}</p></div> <button class="rounded-md bg-accent px-4 py-2 text-sm font-600 text-surface-900 transition-colors hover:bg-accent-hover">${escape_html("New Team")}</button></div> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (myTeams().length > 0) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="mt-6"><h2 class="text-sm font-600 text-text-secondary">My Teams</h2> <div class="mt-3 flex flex-col gap-3"><!--[-->`);
      const each_array = ensure_array_like(myTeams());
      for (let $$index_1 = 0, $$length = each_array.length; $$index_1 < $$length; $$index_1++) {
        let t = each_array[$$index_1];
        $$renderer2.push(`<div class="rounded-lg border border-border bg-surface-800 transition-colors"><button class="flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-surface-700">`);
        if (t.avatarUrl) {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<img${attr("src", t.avatarUrl)} alt="" class="h-10 w-10 rounded-full"/>`);
        } else {
          $$renderer2.push("<!--[!-->");
          $$renderer2.push(`<div class="flex h-10 w-10 items-center justify-center rounded-full bg-surface-600 text-sm font-700 text-text-secondary">${escape_html(t.name.charAt(0).toUpperCase())}</div>`);
        }
        $$renderer2.push(`<!--]--> <div class="flex-1"><div class="flex items-center gap-2"><span class="text-sm font-600">${escape_html(t.name)}</span> `);
        if (t.isPersonal) {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<span class="rounded bg-surface-600 px-1.5 py-0.5 text-[10px] font-500 text-text-secondary">solo</span>`);
        } else {
          $$renderer2.push("<!--[!-->");
        }
        $$renderer2.push(`<!--]--></div> <p class="mt-0.5 text-xs text-text-secondary">${escape_html(t.members.length)} member${escape_html(t.members.length !== 1 ? "s" : "")}</p></div> <span${attr_class(`text-sm text-text-secondary transition-transform ${stringify(expandedTeam === t.id ? "rotate-90" : "")}`)}>›</span></button> `);
        if (expandedTeam === t.id) {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<div class="border-t border-border px-4 pb-4 pt-3"><div class="flex flex-col gap-2"><!--[-->`);
          const each_array_1 = ensure_array_like(t.members);
          for (let $$index = 0, $$length2 = each_array_1.length; $$index < $$length2; $$index++) {
            let member = each_array_1[$$index];
            $$renderer2.push(`<div class="flex items-center gap-3 rounded-md bg-surface-700 px-3 py-2">`);
            if (member.user?.image) {
              $$renderer2.push("<!--[-->");
              $$renderer2.push(`<img${attr("src", member.user.image)} alt="" class="h-6 w-6 rounded-full"/>`);
            } else {
              $$renderer2.push("<!--[!-->");
              $$renderer2.push(`<div class="h-6 w-6 rounded-full bg-surface-600"></div>`);
            }
            $$renderer2.push(`<!--]--> <span class="flex-1 text-sm">${escape_html(member.user?.name ?? "Unknown")}</span> <span class="text-xs text-text-secondary">${escape_html(member.role)}</span> `);
            if (isOwner(t) && member.userId !== data.userId) {
              $$renderer2.push("<!--[-->");
              $$renderer2.push(`<form method="post" action="?/removeMember"><input type="hidden" name="memberId"${attr("value", member.id)}/> <button type="submit" class="text-xs text-red-400 opacity-50 transition-opacity hover:opacity-100">×</button></form>`);
            } else {
              $$renderer2.push("<!--[!-->");
            }
            $$renderer2.push(`<!--]--></div>`);
          }
          $$renderer2.push(`<!--]--></div> `);
          if (isOwner(t) && !t.isPersonal) {
            $$renderer2.push("<!--[-->");
            if (addingMemberTo === t.id) {
              $$renderer2.push("<!--[-->");
              $$renderer2.push(`<form method="post" action="?/addMember" class="mt-3 flex gap-2"><input type="hidden" name="teamId"${attr("value", t.id)}/> <input type="text" name="username"${attr("value", memberUsername)} placeholder="osu! username" required="" class="flex-1 rounded-md border border-border bg-surface-600 px-3 py-1.5 text-sm text-text-primary placeholder:text-text-secondary/50 focus:border-accent focus:outline-none"/> <button type="submit" class="rounded-md bg-accent px-3 py-1.5 text-xs font-600 text-surface-900 hover:bg-accent-hover">Add</button> <button type="button" class="rounded-md border border-border px-3 py-1.5 text-xs text-text-secondary hover:bg-surface-600">Cancel</button></form>`);
            } else {
              $$renderer2.push("<!--[!-->");
              $$renderer2.push(`<button class="mt-3 w-full rounded-md border border-dashed border-border py-2 text-xs text-text-secondary transition-colors hover:border-accent/40 hover:text-accent">+ Add Member</button>`);
            }
            $$renderer2.push(`<!--]-->`);
          } else {
            $$renderer2.push("<!--[!-->");
          }
          $$renderer2.push(`<!--]--> `);
          if (isOwner(t) && !t.isPersonal) {
            $$renderer2.push("<!--[-->");
            $$renderer2.push(`<form method="post" action="?/deleteTeam"><input type="hidden" name="teamId"${attr("value", t.id)}/> <button type="submit" class="mt-3 text-xs text-red-400 opacity-50 transition-opacity hover:opacity-100">Delete team</button></form>`);
          } else {
            $$renderer2.push("<!--[!-->");
          }
          $$renderer2.push(`<!--]--></div>`);
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
    if (otherTeams().length > 0) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="mt-6"><h2 class="text-sm font-600 text-text-secondary">Other Teams</h2> <div class="mt-3 flex flex-col gap-2"><!--[-->`);
      const each_array_2 = ensure_array_like(otherTeams());
      for (let $$index_2 = 0, $$length = each_array_2.length; $$index_2 < $$length; $$index_2++) {
        let t = each_array_2[$$index_2];
        $$renderer2.push(`<div class="flex items-center gap-4 rounded-lg border border-border bg-surface-800 p-3">`);
        if (t.avatarUrl) {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<img${attr("src", t.avatarUrl)} alt="" class="h-8 w-8 rounded-full"/>`);
        } else {
          $$renderer2.push("<!--[!-->");
          $$renderer2.push(`<div class="flex h-8 w-8 items-center justify-center rounded-full bg-surface-600 text-xs font-700 text-text-secondary">${escape_html(t.name.charAt(0).toUpperCase())}</div>`);
        }
        $$renderer2.push(`<!--]--> <div class="flex-1"><span class="text-sm font-600">${escape_html(t.name)}</span> <p class="text-xs text-text-secondary">${escape_html(t.members.length)} member${escape_html(t.members.length !== 1 ? "s" : "")}</p></div></div>`);
      }
      $$renderer2.push(`<!--]--></div></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (data.teams.length === 0) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="mt-6 rounded-lg border border-dashed border-border py-12 text-center"><p class="text-sm text-text-secondary">No teams yet. Your personal team is created when you sign in.</p></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></div>`);
  });
}

export { _page as default };
//# sourceMappingURL=_page.svelte-B33-skqO.js.map
