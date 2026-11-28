"use server";

import { refresh, updateTag } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/dal";

const uuid = z.string().uuid();

const newMedia = z.object({
  path: z
    .string()
    .regex(/^[a-z0-9][a-z0-9/_.-]*\.(webp|avif|png|jpe?g)$/i, "Unexpected storage path.")
    .max(400),
  width: z.number().int().positive().max(20000),
  height: z.number().int().positive().max(40000),
  lqip: z.string().startsWith("data:image/").max(4000).nullable(),
  alt: z.string().trim().max(300),
});

/** The browser has already put the file in Storage (admin-only RLS); this records the row. */
export async function registerMedia(input: z.input<typeof newMedia>): Promise<{ error: string | null; id?: string }> {
  const { supabase } = await requireAdmin();
  const parsed = newMedia.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid upload." };
  const { data, error } = await supabase
    .from("media")
    .insert({ kind: "image", source: "storage", ...parsed.data })
    .select("id")
    .single();
  if (error) {
    await supabase.storage.from("media").remove([parsed.data.path]);
    return { error: error.message };
  }
  refresh();
  return { error: null, id: data.id };
}

export async function updateAlt(id: string, alt: string) {
  const { supabase } = await requireAdmin();
  await supabase
    .from("media")
    .update({ alt: z.string().trim().max(300).parse(alt) })
    .eq("id", uuid.parse(id));
  updateTag("content");
}

/** Deletes the row (galleries drop it, covers and logos fall back to none) and the stored file. */
export async function deleteMedia(id: string): Promise<{ error: string | null }> {
  const { supabase } = await requireAdmin();
  const { data: row } = await supabase.from("media").select("source, path").eq("id", uuid.parse(id)).maybeSingle();
  if (!row) return { error: "Already gone." };
  const { error } = await supabase.from("media").delete().eq("id", id);
  if (error) return { error: error.message };
  if (row.source === "storage") await supabase.storage.from("media").remove([row.path]);
  updateTag("content");
  refresh();
  return { error: null };
}
