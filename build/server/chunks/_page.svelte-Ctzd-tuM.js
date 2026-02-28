import { a6 as escape_html } from './index3-C4geC3K_.js';
import './root-D12ma0No.js';
import './utils-D_bK1W85.js';
import './exports-B5ORJhfK.js';
import './state.svelte-DvHRBIfo.js';

function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { data } = $$props;
    $$renderer2.push(`<h1>Hi, ${escape_html(data.user.name)}!</h1> <p>Your user ID is ${escape_html(data.user.id)}.</p> <form method="post" action="?/signOut"><button class="rounded-md bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700">Sign out</button></form>`);
  });
}

export { _page as default };
//# sourceMappingURL=_page.svelte-Ctzd-tuM.js.map
