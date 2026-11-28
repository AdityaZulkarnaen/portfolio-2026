"use client";

import { useTransition } from "react";

import { deleteMessage, setMessageArchived, setMessageRead } from "../../actions";

type Message = {
  id: string;
  name: string;
  email: string;
  body: string;
  read_at: string | null;
  archived: boolean;
  created_at: string;
};

export function MessageItem({ message: m }: { message: Message }) {
  const [pending, start] = useTransition();
  const unread = !m.read_at;
  const date = new Date(m.created_at).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <li className={`rounded-xl shadow-[inset_0_0_0_1px_var(--color-line)] ${pending ? "opacity-60" : ""}`}>
      <details
        onToggle={(e) => {
          if (e.currentTarget.open && unread) start(() => setMessageRead(m.id, true));
        }}
      >
        <summary className="flex cursor-pointer list-none items-center gap-4 p-5">
          <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${unread ? "bg-lilac-500" : "bg-transparent"}`} />
          <span className={`min-w-0 flex-1 truncate ${unread ? "font-semibold text-bone-100" : "text-bone-400"}`}>
            {m.name} <span className="font-normal text-bone-400">· {m.email}</span>
            {unread ? <span className="sr-only"> (unread)</span> : null}
          </span>
          <time dateTime={m.created_at} className="shrink-0 text-sm text-bone-400 tabular-nums">
            {date}
          </time>
        </summary>
        <div className="border-t border-line px-5 pt-4 pb-5">
          <p className="whitespace-pre-wrap leading-relaxed">{m.body}</p>
          <div className="mt-5 flex flex-wrap gap-5">
            <a href={`mailto:${m.email}?subject=${encodeURIComponent("Re: your message")}`} className="slate text-link">
              Reply by email
            </a>
            <button type="button" className="slate text-link" onClick={() => start(() => setMessageRead(m.id, unread))}>
              Mark {unread ? "read" : "unread"}
            </button>
            <button type="button" className="slate text-link" onClick={() => start(() => setMessageArchived(m.id, !m.archived))}>
              {m.archived ? "Move to inbox" : "Archive"}
            </button>
            <button
              type="button"
              className="slate text-link text-[#ff9b8a]"
              onClick={() => {
                if (confirm(`Delete the message from ${m.name}? This can't be undone.`)) start(() => deleteMessage(m.id));
              }}
            >
              Delete
            </button>
          </div>
        </div>
      </details>
    </li>
  );
}
