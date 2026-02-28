import "./state.svelte.js";
import "clsx";
import "@sveltejs/kit/internal";
import "./url.js";
import "./utils.js";
import { w as writable } from "./index.js";
import "@sveltejs/kit/internal/server";
import "./root.js";
import "./exports.js";
import { g as getContext } from "./index3.js";
function create_updated_store() {
  const { set, subscribe } = writable(false);
  {
    return {
      subscribe,
      // eslint-disable-next-line @typescript-eslint/require-await
      check: async () => false
    };
  }
}
const stores = {
  updated: /* @__PURE__ */ create_updated_store()
};
({
  check: stores.updated.check
});
function context() {
  return getContext("__request__");
}
const page$1 = {
  get data() {
    return context().page.data;
  },
  get error() {
    return context().page.error;
  },
  get status() {
    return context().page.status;
  },
  get url() {
    return context().page.url;
  }
};
const page = page$1;
export {
  page as p
};
