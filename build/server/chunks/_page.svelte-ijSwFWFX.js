import { a6 as escape_html, a8 as ensure_array_like, a9 as attr, ab as stringify } from './index3-C4geC3K_.js';
import './root-D12ma0No.js';
import './utils-D_bK1W85.js';
import './exports-B5ORJhfK.js';
import './state.svelte-DvHRBIfo.js';

function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { data } = $$props;
    $$renderer2.push(`<div class="mx-auto max-w-4xl"><div class="flex items-center justify-between"><div><h1 class="text-2xl font-700 tracking-tight">Mappools</h1> <p class="mt-1 text-sm text-text-secondary">Create and manage your beatmap pools</p></div> <button class="rounded-md bg-accent px-4 py-2 text-sm font-600 text-surface-900 transition-colors hover:bg-accent-hover">${escape_html("New Pool")}</button></div> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> <div class="mt-6 flex flex-col gap-3">`);
    const each_array = ensure_array_like(data.mappools);
    if (each_array.length !== 0) {
      $$renderer2.push("<!--[-->");
      for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
        let pool = each_array[$$index];
        $$renderer2.push(`<a${attr("href", `/mappools/${stringify(pool.id)}`)} class="group flex items-center justify-between rounded-lg border border-border bg-surface-800 p-4 transition-colors hover:border-accent/40 hover:bg-surface-700"><div><h2 class="text-sm font-600">${escape_html(pool.name)}</h2> <p class="mt-1 text-xs text-text-secondary">${escape_html(pool.slots.length)} map${escape_html(pool.slots.length !== 1 ? "s" : "")}
						· Created ${escape_html(new Date(pool.createdAt).toLocaleDateString())}</p></div> <span class="text-text-secondary transition-colors group-hover:text-accent">→</span></a>`);
      }
    } else {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`<div class="rounded-lg border border-dashed border-border py-12 text-center"><p class="text-sm text-text-secondary">No mappools yet. Create one to get started.</p></div>`);
    }
    $$renderer2.push(`<!--]--></div></div>`);
  });
}

export { _page as default };
//# sourceMappingURL=_page.svelte-ijSwFWFX.js.map
