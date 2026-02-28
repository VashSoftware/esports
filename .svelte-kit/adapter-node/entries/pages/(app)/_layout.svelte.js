import { a as ensure_array_like, b as attr, c as attr_class, s as stringify, e as escape_html, d as derived } from "../../../chunks/index3.js";
import { p as page } from "../../../chunks/index4.js";
import "@sveltejs/kit/internal";
import "../../../chunks/url.js";
import "../../../chunks/utils.js";
import "@sveltejs/kit/internal/server";
import "../../../chunks/root.js";
import "../../../chunks/exports.js";
import "../../../chunks/state.svelte.js";
function Sidebar($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const user = derived(() => page.data?.user);
    const nav = [
      { href: "/", label: "Dashboard", icon: "⌂" },
      { href: "/matches", label: "Matches", icon: "⚔" },
      { href: "/mappools", label: "Mappools", icon: "♫" },
      { href: "/teams", label: "Teams", icon: "⚑" }
    ];
    function isActive(href) {
      if (href === "/") return page.url.pathname === "/";
      return page.url.pathname.startsWith(href);
    }
    const isAdmin = derived(() => user()?.role === "admin");
    $$renderer2.push(`<aside class="fixed top-0 left-0 z-40 flex h-full w-56 flex-col border-r border-border bg-surface-800"><a href="/" class="flex items-center gap-2.5 px-5 py-5"><div class="font-800 flex h-8 w-8 items-center justify-center rounded-md bg-accent text-sm text-surface-900">V</div> <span class="font-700 text-base tracking-tight text-text-primary">Vash Esports</span></a> <nav class="mt-2 flex flex-1 flex-col gap-0.5 px-3"><!--[-->`);
    const each_array = ensure_array_like(nav);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let item = each_array[$$index];
      $$renderer2.push(`<a${attr("href", item.href)}${attr_class(`font-500 flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${stringify(isActive(item.href) ? "bg-accent-dim text-accent" : "text-text-secondary hover:bg-surface-700 hover:text-text-primary")}`)}><span class="text-base">${escape_html(item.icon)}</span> ${escape_html(item.label)}</a>`);
    }
    $$renderer2.push(`<!--]--> `);
    if (isAdmin()) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="mt-4 mb-1 px-3"><p class="text-[10px] font-600 text-text-secondary uppercase tracking-widest">Staff</p></div> <a href="/admin"${attr_class(`font-500 flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${stringify(isActive("/admin") ? "bg-red-500/10 text-red-400" : "text-text-secondary hover:bg-surface-700 hover:text-text-primary")}`)}><span class="text-base">⚡</span> Admin</a>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></nav> <div class="border-t border-border p-3"><a href="/settings"${attr_class(`font-500 flex items-center gap-3 rounded-md px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-surface-700 hover:text-text-primary ${stringify(isActive("/settings") ? "bg-accent-dim text-accent" : "")}`)}><span class="text-base">⚙</span> Settings</a></div></aside>`);
  });
}
function Header($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const user = derived(() => page.data?.user);
    const roleBadge = {
      referee: { label: "REF", color: "bg-yellow-500/20 text-yellow-400" },
      admin: { label: "ADMIN", color: "bg-red-500/20 text-red-400" }
    };
    const badge = derived(() => user()?.role ? roleBadge[user().role] : null);
    $$renderer2.push(`<header class="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-surface-900/80 px-6 backdrop-blur-md"><div></div> <div class="flex items-center gap-4">`);
    if (user()) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="flex items-center gap-3">`);
      if (badge()) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<span${attr_class(`rounded px-1.5 py-0.5 text-[10px] font-700 ${stringify(badge().color)}`)}>${escape_html(badge().label)}</span>`);
      } else {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]--> `);
      if (user().image) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<img${attr("src", user().image)}${attr("alt", user().name)} class="h-7 w-7 rounded-full"/>`);
      } else {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]--> <span class="font-500 text-sm text-text-primary">${escape_html(user().name)}</span> <form method="post" action="/settings?/logout"><button type="submit" class="rounded-md border border-border px-2.5 py-1 text-xs text-text-secondary transition-colors hover:border-red-500/30 hover:text-red-400">Logout</button></form></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`<a href="/login" class="font-600 rounded-md bg-accent px-3.5 py-1.5 text-sm text-surface-900 transition-colors hover:bg-accent-hover">Sign in with osu!</a>`);
    }
    $$renderer2.push(`<!--]--></div></header>`);
  });
}
function _layout($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { children } = $$props;
    const user = derived(() => page.data?.user);
    if (user()) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="flex min-h-dvh">`);
      Sidebar($$renderer2);
      $$renderer2.push(`<!----> <div class="ml-56 flex flex-1 flex-col">`);
      Header($$renderer2);
      $$renderer2.push(`<!----> <main class="flex-1 p-6">`);
      children($$renderer2);
      $$renderer2.push(`<!----></main></div></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`<div class="min-h-dvh"><header class="flex h-14 items-center justify-between border-b border-border bg-surface-900/80 px-6 backdrop-blur-md"><a href="/" class="flex items-center gap-2.5"><div class="font-800 flex h-8 w-8 items-center justify-center rounded-md bg-accent text-sm text-surface-900">V</div> <span class="font-700 text-base tracking-tight text-text-primary">Vash Esports</span></a> <a href="/login" class="font-600 rounded-md bg-accent px-3.5 py-1.5 text-sm text-surface-900 transition-colors hover:bg-accent-hover">Sign in with osu!</a></header> <main class="p-6">`);
      children($$renderer2);
      $$renderer2.push(`<!----></main></div>`);
    }
    $$renderer2.push(`<!--]-->`);
  });
}
export {
  _layout as default
};
