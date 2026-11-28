import Link from "next/link";
import { Suspense } from "react";

import { LogoMark } from "@/components/site/logo-mark";
import { requireAdmin } from "@/lib/auth/dal";

import { signOut } from "../actions";

/** Panel chrome. The gate runs inside Suspense: it reads cookies, so it is request-time. */
export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<p className="slate text-bone-400">Checking session…</p>}>
      <Shell>{children}</Shell>
    </Suspense>
  );
}

async function Shell({ children }: { children: React.ReactNode }) {
  const { supabase, email } = await requireAdmin();
  const { count: unread } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .is("read_at", null)
    .eq("archived", false);

  const links = [
    { href: "/admin", label: "Dashboard" },
    { href: "/admin/messages", label: "Messages", badge: unread ?? 0 },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-5">
        <div className="flex items-center gap-6">
          <Link href="/admin" className="flex items-center gap-3" aria-label="Admin home">
            <LogoMark className="size-7 text-bone-100" />
            <span className="slate">Admin</span>
          </Link>
          <nav aria-label="Admin" className="flex gap-5">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="slate flex items-center gap-2 text-bone-400 transition-colors hover:text-bone-100">
                {l.label}
                {l.badge ? (
                  <span className="grid min-w-5 place-items-center rounded-full bg-lilac-500 px-1.5 text-[10px] text-ink-950 tabular-nums">
                    {l.badge}
                  </span>
                ) : null}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-5">
          <Link href="/" className="slate text-link">
            View site ↗
          </Link>
          <span className="hidden text-sm text-bone-400 sm:inline">{email}</span>
          <form action={signOut}>
            <button type="submit" className="slate text-link">
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="py-10">{children}</main>
    </div>
  );
}
