import './state.svelte-DvHRBIfo.js';
import './root-D12ma0No.js';
import './utils-D_bK1W85.js';
import { w as writable } from './index-MqY7A75_.js';
import './exports-B5ORJhfK.js';
import { a7 as getContext } from './index3-C4geC3K_.js';

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

export { page as p };
//# sourceMappingURL=index4-B8FtU3M-.js.map
