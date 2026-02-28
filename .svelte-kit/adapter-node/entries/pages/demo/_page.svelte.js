import { b as attr } from "../../../chunks/index3.js";
import { i as initial_base, b as base } from "../../../chunks/server.js";
import { r as resolve_route } from "../../../chunks/routing.js";
import "../../../chunks/url.js";
import { try_get_request_store } from "@sveltejs/kit/internal/server";
import "../../../chunks/root.js";
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
export {
  _page as default
};
