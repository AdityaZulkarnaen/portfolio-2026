"use client";

import { useSearchParams } from "next/navigation";
import { useActionState } from "react";

import { signIn, type LoginState } from "../actions";

const field =
  "mt-2 block w-full rounded-lg bg-ink-950 px-4 py-3 text-bone-100 shadow-[inset_0_0_0_1px_var(--color-line-strong)] outline-none focus:shadow-[inset_0_0_0_1px_var(--color-lilac-500)]";

export function LoginForm() {
  const params = useSearchParams();
  const [state, action, pending] = useActionState<LoginState, FormData>(signIn, { error: null, email: "" });
  const error =
    state.error ?? (params.get("error") === "not-admin" ? "That account isn't an admin. Sign in with the admin email." : null);

  return (
    <form action={action} className="mt-8 grid gap-5">
      <input type="hidden" name="next" value={params.get("next") ?? "/admin"} />
      <label className="slate text-bone-400">
        Email
        <input name="email" type="email" autoComplete="username" required defaultValue={state.email} className={`${field} text-base normal-case tracking-normal`} />
      </label>
      <label className="slate text-bone-400">
        Password
        <input name="password" type="password" autoComplete="current-password" required className={`${field} text-base normal-case tracking-normal`} />
      </label>
      {error ? (
        <p role="alert" className="text-sm text-[#ff9b8a]">
          {error}
        </p>
      ) : null}
      <button type="submit" disabled={pending} className="pill-btn justify-center">
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
