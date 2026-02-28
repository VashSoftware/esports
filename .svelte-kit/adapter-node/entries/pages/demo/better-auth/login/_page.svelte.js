import { e as escape_html } from "../../../../../chunks/index3.js";
import "clsx";
import "@sveltejs/kit/internal";
import "../../../../../chunks/url.js";
import "../../../../../chunks/utils.js";
import "@sveltejs/kit/internal/server";
import "../../../../../chunks/root.js";
import "../../../../../chunks/exports.js";
import "../../../../../chunks/state.svelte.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { form } = $$props;
    $$renderer2.push(`<h1>Login</h1> <form method="post" action="?/signInEmail"><label>Email <input type="email" name="email" class="mt-1 rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"/></label> <label>Password <input type="password" name="password" class="mt-1 rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"/></label> <label>Name (for registration) <input name="name" class="mt-1 rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"/></label> <button class="rounded-md bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700">Login</button> <button formaction="?/signUpEmail" class="rounded-md bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700">Register</button></form> <p class="text-red-500">${escape_html(form?.message ?? "")}</p> <hr class="my-4"/> <form method="post" action="?/signInSocial"><input type="hidden" name="provider" value="osu"/> <input type="hidden" name="callbackURL" value="/demo/better-auth"/> <button class="rounded-md bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700">Sign in with osu!</button></form>`);
  });
}
export {
  _page as default
};
