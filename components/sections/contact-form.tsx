"use client";

import { useActionState, useLayoutEffect, useRef } from "react";

import { submitContact, type ContactState } from "@/app/actions/contact";

const initial: ContactState = { status: "idle" };

export function ContactForm() {
  const [state, action, pending] = useActionState(submitContact, initial);
  const formRef = useRef<HTMLFormElement>(null);
  const fe = state.status === "error" ? state.fieldErrors : undefined;
  const values = state.status === "error" ? state.values : undefined;

  // Clear a stale success when Activity hides the page.
  useLayoutEffect(() => {
    const form = formRef.current;
    if (state.status === "success") form?.reset();
    return () => {
      if (state.status === "success") form?.reset();
    };
  }, [state]);

  return (
    <form ref={formRef} action={action} className="grid gap-6 sm:grid-cols-2 sm:gap-x-8" noValidate>
      <div className="grid gap-2">
        <label htmlFor="cf-name" className="slate text-bone-400">
          Name
        </label>
        <input
          id="cf-name"
          className="w-full rounded-none border-0 border-b border-line-strong bg-transparent py-3 text-lg text-bone-100 outline-none transition-colors focus-visible:border-ember-500 focus-visible:shadow-[0_1px_0_0_var(--color-ember-500)] aria-[invalid=true]:border-ember-300"
          name="name"
          autoComplete="name"
          required
          minLength={2}
          maxLength={120}
          defaultValue={values?.name}
          aria-invalid={fe?.name ? true : undefined}
          aria-describedby={fe?.name ? "cf-name-err" : undefined}
        />
        {fe?.name ? (
          <p id="cf-name-err" className="text-[0.9rem] text-ember-300">
            {fe.name}
          </p>
        ) : null}
      </div>
      <div className="grid gap-2">
        <label htmlFor="cf-email" className="slate text-bone-400">
          Email
        </label>
        <input
          id="cf-email"
          className="w-full rounded-none border-0 border-b border-line-strong bg-transparent py-3 text-lg text-bone-100 outline-none transition-colors focus-visible:border-ember-500 focus-visible:shadow-[0_1px_0_0_var(--color-ember-500)] aria-[invalid=true]:border-ember-300"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={values?.email}
          aria-invalid={fe?.email ? true : undefined}
          aria-describedby={fe?.email ? "cf-email-err" : undefined}
        />
        {fe?.email ? (
          <p id="cf-email-err" className="text-[0.9rem] text-ember-300">
            {fe.email}
          </p>
        ) : null}
      </div>
      <div className="grid gap-2 sm:col-span-2">
        <label htmlFor="cf-message" className="slate text-bone-400">
          Project, idea or hello
        </label>
        <textarea
          id="cf-message"
          className="w-full rounded-none border-0 border-b border-line-strong bg-transparent py-3 text-lg text-bone-100 outline-none transition-colors focus-visible:border-ember-500 focus-visible:shadow-[0_1px_0_0_var(--color-ember-500)] aria-[invalid=true]:border-ember-300 min-h-32 resize-y leading-normal"
          name="message"
          rows={5}
          required
          minLength={10}
          maxLength={4000}
          defaultValue={values?.message}
          aria-invalid={fe?.message ? true : undefined}
          aria-describedby={fe?.message ? "cf-message-err" : undefined}
        />
        {fe?.message ? (
          <p id="cf-message-err" className="text-[0.9rem] text-ember-300">
            {fe.message}
          </p>
        ) : null}
      </div>
      <div className="absolute -left-[10000px] size-px overflow-hidden" aria-hidden="true">
        <label htmlFor="cf-company">Company</label>
        <input id="cf-company" name="company" tabIndex={-1} autoComplete="off" />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-4 sm:col-span-2">
        <button type="submit" className="pill-btn bg-ember-500 text-ink-950 shadow-none" disabled={pending} aria-disabled={pending}>
          <span>{pending ? "Sending…" : "Send message"}</span>
        </button>
        <p className="text-[0.95rem] text-bone-400 data-[status=error]:text-ember-300 data-[status=success]:text-tide-400" role="status" aria-live="polite" data-status={state.status}>
          {state.status === "idle" ? "" : state.message}
        </p>
      </div>
    </form>
  );
}
