/** Small, pure display helpers shared by site sections. */

export function reelNumber(i: number): string {
  return String(i + 1).padStart(2, "0");
}

export function hostOf(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return null;
  }
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** `2026-06-01` → `Jun 2026`. Pure string math (no Date), so it is safe in prerender. */
export function monthYear(iso: string | null): string {
  if (!iso) return "Present";
  const [y, m] = iso.split("-");
  const month = MONTHS[Number(m) - 1];
  return month ? `${month} ${y}` : y;
}

export function dateRange(start: string, end: string | null): string {
  return `${monthYear(start)} – ${monthYear(end)}`;
}

/** Frames for a placement, in reading order. */
export function framesFor<T extends { placement: string }>(frames: T[], where: "showcase" | "case"): T[] {
  return frames.filter((f) => f.placement === where || f.placement === "both");
}

/** Readable text color (ink or bone) on top of an accent hex. */
export function accentOrDefault(accent: string | null | undefined): string {
  return accent && /^#[0-9a-f]{6}$/i.test(accent) ? accent : "#ff5b2e";
}
