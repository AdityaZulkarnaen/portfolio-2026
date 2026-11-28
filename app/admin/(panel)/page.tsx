import Link from "next/link";

import { requireAdmin } from "@/lib/auth/dal";

import { RevalidateButton } from "./revalidate-button";

const TABLES = [
  { table: "projects", label: "Projects" },
  { table: "experiences", label: "Experience" },
  { table: "achievements", label: "Awards & teams" },
  { table: "skills", label: "Skills" },
  { table: "clients", label: "Clients" },
  { table: "testimonials", label: "Testimonials" },
] as const;

export default async function AdminDashboard() {
  const { supabase } = await requireAdmin();
  const [counts, unread, latest] = await Promise.all([
    Promise.all(TABLES.map((t) => supabase.from(t.table).select("id", { count: "exact", head: true }).then((r) => r.count ?? 0))),
    supabase.from("messages").select("id", { count: "exact", head: true }).is("read_at", null).eq("archived", false),
    supabase.from("messages").select("id, name, created_at").eq("archived", false).order("created_at", { ascending: false }).limit(3),
  ]);

  return (
    <div className="grid gap-12">
      <section>
        <h1 className="text-4xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-2 text-bone-400">What is on the site right now.</p>
        <dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-line sm:grid-cols-3 lg:grid-cols-6">
          {TABLES.map((t, i) => (
            <div key={t.table} className="bg-ink-900 p-5">
              <dt className="slate text-bone-400">{t.label}</dt>
              <dd className="mt-3 text-3xl font-bold tabular-nums">{counts[i]}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl p-6 shadow-[inset_0_0_0_1px_var(--color-line)]">
          <h2 className="slate text-bone-400">Inbox</h2>
          <p className="mt-3 text-2xl font-semibold">
            {unread.count ? `${unread.count} unread` : "All read"}
          </p>
          <ul className="mt-4 grid gap-2 text-bone-400">
            {(latest.data ?? []).map((m) => (
              <li key={m.id} className="flex justify-between gap-4">
                <span className="truncate text-bone-100">{m.name}</span>
                <time dateTime={m.created_at} className="shrink-0 tabular-nums">
                  {new Date(m.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                </time>
              </li>
            ))}
            {latest.data?.length ? null : <li>No messages yet.</li>}
          </ul>
          <Link href="/admin/messages" className="slate text-link mt-6">
            Open inbox →
          </Link>
        </div>
        <div className="rounded-xl p-6 shadow-[inset_0_0_0_1px_var(--color-line)]">
          <h2 className="slate text-bone-400">Site cache</h2>
          <p className="mt-3 text-bone-400">
            Pages are cached for a day. After editing content directly in Supabase, refresh the cache so visitors see it on
            their next visit.
          </p>
          <RevalidateButton />
        </div>
      </section>
    </div>
  );
}
