import type { Metadata } from "next";
import { Suspense } from "react";

import { LogoMark } from "@/components/site/logo-mark";

import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main className="grid min-h-[80svh] place-items-center">
      <div className="w-full max-w-sm">
        <LogoMark className="size-10 text-bone-100" />
        <h1 className="mt-6 text-3xl font-bold tracking-tight">Admin</h1>
        <p className="mt-2 text-bone-400">Sign in to edit the portfolio.</p>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
