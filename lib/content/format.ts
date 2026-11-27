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

/** `2026-10-01` → `10.2026`, like a slate timecode. */
export function monthStamp(iso: string | null): string {
  if (!iso) return "now";
  const [y, m] = iso.split("-");
  return m ? `${m}.${y}` : y;
}

/** Inclusive length of a run of months, "1 yr 4 mos". `end` is an ISO date ("2025-11-01"). */
export function tenure(start: string, end: string): string {
  const [sy, sm = 1] = start.split("-").map(Number);
  const [ey, em = 1] = end.split("-").map(Number);
  const months = Math.max(1, (ey - sy) * 12 + (em - sm) + 1);
  const y = Math.floor(months / 12);
  const m = months % 12;
  return [y ? `${y} yr${y > 1 ? "s" : ""}` : "", m ? `${m} mo${m > 1 ? "s" : ""}` : ""].filter(Boolean).join(" ");
}

export function timecodeRange(start: string, end: string | null): string {
  return `${monthStamp(start)} — ${monthStamp(end)}`;
}

/** Frames for a placement, in reading order. */
export function framesFor<T extends { placement: string }>(frames: T[], where: "showcase" | "case"): T[] {
  return frames.filter((f) => f.placement === where || f.placement === "both");
}

/** Readable text color (ink or bone) on top of an accent hex. */
export function accentOrDefault(accent: string | null | undefined): string {
  return accent && /^#[0-9a-f]{6}$/i.test(accent) ? accent : "#a99bff";
}
