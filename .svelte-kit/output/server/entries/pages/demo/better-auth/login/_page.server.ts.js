import { redirect, fail } from "@sveltejs/kit";
import { a as auth } from "../../../../../chunks/auth.js";
import "@better-auth/core/env";
import "@better-auth/core/utils";
import { APIError } from "better-call";
import "@better-auth/core/api";
const load = async (event) => {
  if (event.locals.user) {
    return redirect(302, "/demo/better-auth");
  }
  return {};
};
const actions = {
  signInEmail: async (event) => {
    const formData = await event.request.formData();
    const email = formData.get("email")?.toString() ?? "";
    const password = formData.get("password")?.toString() ?? "";
    try {
      await auth.api.signInEmail({
        body: {
          email,
          password,
          callbackURL: "/auth/verification-success"
        }
      });
    } catch (error) {
      if (error instanceof APIError) {
        return fail(400, { message: error.message || "Signin failed" });
      }
      return fail(500, { message: "Unexpected error" });
    }
    return redirect(302, "/demo/better-auth");
  },
  signUpEmail: async (event) => {
    const formData = await event.request.formData();
    const email = formData.get("email")?.toString() ?? "";
    const password = formData.get("password")?.toString() ?? "";
    const name = formData.get("name")?.toString() ?? "";
    try {
      await auth.api.signUpEmail({
        body: {
          email,
          password,
          name,
          callbackURL: "/auth/verification-success"
        }
      });
    } catch (error) {
      if (error instanceof APIError) {
        return fail(400, { message: error.message || "Registration failed" });
      }
      return fail(500, { message: "Unexpected error" });
    }
    return redirect(302, "/demo/better-auth");
  },
  signInSocial: async (event) => {
    const formData = await event.request.formData();
    const provider = formData.get("provider")?.toString() ?? "osu";
    const callbackURL = formData.get("callbackURL")?.toString() ?? "/demo/better-auth";
    const result = await auth.api.signInSocial({
      body: {
        provider,
        callbackURL
      }
    });
    if (result.url) {
      return redirect(302, result.url);
    }
    return fail(400, { message: "Social sign-in failed" });
  }
};
export {
  actions,
  load
};
