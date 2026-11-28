import { resolveMediaUrl } from "@/lib/content/media-url";

/** The slice of a `media` row the admin pickers and library show. */
export type AdminMedia = {
  id: string;
  kind: string;
  source: string;
  path: string;
  url: string;
  width: number | null;
  height: number | null;
  alt: string;
};

export const MEDIA_COLUMNS = "id, kind, source, path, width, height, alt";

export function toAdminMedia(row: Omit<AdminMedia, "url">): AdminMedia {
  return { ...row, url: resolveMediaUrl(row.source, row.path) };
}
