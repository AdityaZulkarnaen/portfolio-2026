"use server";

import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/dal";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type LoginState = { error: string | null; email: string };

const loginSchema = z.object({
  email: z.string().trim().email("Enter the admin email."),
  password: z.string().min(1, "Enter the password."),
});

/** Only same-site admin paths are allowed as the post-login destination. */
function safeNext(value: FormDataEntryValue | null): string {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/admin") && !next.startsWith("/admin/login") ? next : "/admin";
}

export async function signIn(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "");
  const parsed = loginSchema.safeParse({ email, password: formData.get("password") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form.", email };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: "That email and password don't match.", email };
  redirect(safeNext(formData.get("next")));
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

/** Every public read is tagged `content`: this refreshes the whole site on its next visit. */
export async function revalidateSite() {
  await requireAdmin();
  updateTag("content");
  refresh();
}

const id = z.string().uuid();

export async function setMessageRead(messageId: string, read: boolean) {
  const { supabase } = await requireAdmin();
  await supabase.from("messages").update({ read_at: read ? new Date().toISOString() : null }).eq("id", id.parse(messageId));
  refresh();
}

export async function setMessageArchived(messageId: string, archived: boolean) {
  const { supabase } = await requireAdmin();
  await supabase.from("messages").update({ archived }).eq("id", id.parse(messageId));
  refresh();
}

export async function deleteMessage(messageId: string) {
  const { supabase } = await requireAdmin();
  await supabase.from("messages").delete().eq("id", id.parse(messageId));
  refresh();
}
