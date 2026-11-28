import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Admin gate, layers 2 and 3: every admin page (through the panel layout) and every admin
 * Server Action calls this. A signed-in user who is not in `admins` is signed out and sent
 * back to the login; RLS (`is_admin()`) still guards every write underneath.
 */
export const requireAdmin = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect("/admin/login");

  const { data: row } = await supabase.from("admins").select("user_id, email").eq("user_id", userId).maybeSingle();
  if (!row) {
    await supabase.auth.signOut();
    redirect("/admin/login?error=not-admin");
  }
  return { supabase, userId, email: row.email };
});
