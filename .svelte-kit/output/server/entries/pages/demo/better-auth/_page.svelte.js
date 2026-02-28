import { e as escape_html } from "../../../../chunks/index3.js";
import "clsx";
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
    $$renderer2.push(`<h1>Hi, ${escape_html(data.user.name)}!</h1> <p>Your user ID is ${escape_html(data.user.id)}.</p> <form method="post" action="?/signOut"><button class="rounded-md bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700">Sign out</button></form>`);
  });
}
export {
  _page as default
};
