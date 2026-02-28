import { a6 as escape_html } from './index3-C4geC3K_.js';
import { p as page } from './index4-B8FtU3M-.js';
import './state.svelte-DvHRBIfo.js';
import './root-D12ma0No.js';
import './utils-D_bK1W85.js';
import './index-MqY7A75_.js';
import './exports-B5ORJhfK.js';

function _error($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    $$renderer2.push(`<div class="flex min-h-dvh items-center justify-center bg-surface-900"><div class="text-center"><p class="text-6xl font-800 text-accent">${escape_html(page.status)}</p> <h1 class="mt-4 text-xl font-700 text-text-primary">`);
    if (page.status === 404) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`Page not found`);
    } else if (page.status === 403) {
      $$renderer2.push("<!--[1-->");
      $$renderer2.push(`Access denied`);
    } else if (page.status === 401) {
      $$renderer2.push("<!--[2-->");
      $$renderer2.push(`Not logged in`);
    } else {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`Something went wrong`);
    }
    $$renderer2.push(`<!--]--></h1> <p class="mt-2 text-sm text-text-secondary">${escape_html(page.error?.message ?? "An unexpected error occurred.")}</p> <a href="/" class="mt-6 inline-block rounded-md bg-accent px-5 py-2.5 text-sm font-600 text-surface-900 transition-colors hover:bg-accent-hover">Back to Dashboard</a></div></div>`);
  });
}

export { _error as default };
//# sourceMappingURL=_error.svelte-Szt4-wKI.js.map
