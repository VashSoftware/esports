import { a9 as attr } from './index3-C4geC3K_.js';
import { e as resolve_route, i as initial_base, b as base } from './routing-NqiTWnxU.js';
import { t as try_get_request_store } from './root-D12ma0No.js';

function resolve(id, params) {
  const resolved = resolve_route(
    id,
    /** @type {Record<string, string>} */
    params
  );
  {
    const store = try_get_request_store();
    if (store && !store.state.prerendering?.fallback) {
      const after_base = store.event.url.pathname.slice(initial_base.length);
      const segments = after_base.split("/").slice(2);
      const prefix = segments.map(() => "..").join("/") || ".";
      return prefix + resolved;
    }
  }
  return base + resolved;
}
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    $$renderer2.push(`<a${attr("href", resolve("/demo/better-auth"))}>better-auth</a>`);
  });
}

export { _page as default };
//# sourceMappingURL=_page.svelte-C5eWfXqa.js.map
