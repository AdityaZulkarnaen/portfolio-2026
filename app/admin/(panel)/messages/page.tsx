import type { Metadata } from "next";
import Link from "next/link";

import { requireAdmin } from "@/lib/auth/dal";

import { MessageItem } from "./message-item";

export const metadata: Metadata = { title: "Messages" };

export default async function MessagesPage({ searchParams }: PageProps<"/admin/messages">) {
  const { view } = await searchParams;
  const archived = view === "archived";
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("messages")
    .select("id, name, email, body, read_at, archived, created_at")
    .eq("archived", archived)
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Messages</h1>
          <p className="mt-2 text-bone-400">From the contact form. Opening one marks it read.</p>
        </div>
        <nav aria-label="Message folders" className="flex gap-5">
          <Link href="/admin/messages" aria-current={!archived ? "page" : undefined} className="slate text-bone-400 aria-[current]:text-bone-100">
            Inbox
          </Link>
          <Link href="/admin/messages?view=archived" aria-current={archived ? "page" : undefined} className="slate text-bone-400 aria-[current]:text-bone-100">
            Archived
          </Link>
        </nav>
      </div>
      {error ? <p className="mt-8 text-[#ff9b8a]">Couldn&apos;t load messages: {error.message}</p> : null}
      <ul className="mt-8 grid gap-3">
        {(data ?? []).map((m) => (
          <MessageItem key={m.id} message={m} />
        ))}
      </ul>
      {data?.length === 0 ? <p className="mt-8 text-bone-400">{archived ? "Nothing archived." : "No messages. Inbox zero."}</p> : null}
    </div>
  );
}
