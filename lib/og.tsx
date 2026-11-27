import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";
import sharp from "sharp";

import { MARK_DOT, MARK_PATH } from "@/components/site/logo-mark";

export const OG_SIZE = { width: 1200, height: 630 };

const INK = "#07080B";
const BONE = "#ECE9E2";
const MUTED = "#9C9A93";
const LILAC = "#A99BFF";

async function fonts() {
  const dir = join(process.cwd(), "assets/og");
  const [display, label] = await Promise.all([
    readFile(join(dir, "mona-sans-expanded-800.ttf")),
    readFile(join(dir, "plus-jakarta-600.ttf")),
  ]);
  return [
    { name: "Mona", data: display, weight: 800 as const, style: "normal" as const },
    { name: "Jakarta", data: label, weight: 600 as const, style: "normal" as const },
  ];
}

/**
 * A remote image (webp, which the OG renderer cannot decode) as a PNG data URL, cropped from
 * the top to the box (full-page screenshots show their first screen). Null when it fails.
 */
export async function coverDataUrl(src: string, width: number, height: number): Promise<string | null> {
  try {
    const res = await fetch(src);
    if (!res.ok) return null;
    const png = await sharp(Buffer.from(await res.arrayBuffer()))
      .resize(width, height, { fit: "cover", position: "top" })
      .png()
      .toBuffer();
    return `data:image/png;base64,${png.toString("base64")}`;
  } catch {
    return null;
  }
}

/** The smoke's current, drawn as three soft wave lines along the foot of the card. */
function Waves({ accent }: { accent: string }) {
  const line = (y: number, amp: number, phase: number) => {
    let d = `M0 ${y}`;
    for (let x = 0; x <= 1200; x += 40) d += ` L${x} ${(y + Math.sin(x / 150 + phase) * amp).toFixed(1)}`;
    return d;
  };
  return (
    <svg width="1200" height="630" viewBox="0 0 1200 630" style={{ position: "absolute", inset: 0 }}>
      <path d={line(560, 18, 0)} stroke={accent} strokeOpacity="0.55" strokeWidth="2" fill="none" />
      <path d={line(584, 14, 1.6)} stroke={BONE} strokeOpacity="0.16" strokeWidth="1.5" fill="none" />
      <path d={line(606, 10, 3.1)} stroke={BONE} strokeOpacity="0.08" strokeWidth="1.5" fill="none" />
    </svg>
  );
}

function Mark({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32">
      <path d={MARK_PATH} fill="none" stroke={BONE} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={MARK_DOT.cx} cy={MARK_DOT.cy} r="2.1" fill={LILAC} />
    </svg>
  );
}

export type OgCard = {
  eyebrow: string;
  title: string;
  lines: string[];
  accent?: string;
  /** PNG data URL, and whether it is a phone screen (drawn in a phone shape). */
  image?: { src: string; phone: boolean } | null;
};

export async function renderOg({ eyebrow, title, lines, accent = LILAC, image }: OgCard) {
  const long = title.length > 18;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: `radial-gradient(circle at 82% 18%, ${accent}33, transparent 55%), ${INK}`,
          color: BONE,
          fontFamily: "Jakarta",
        }}
      >
        <Waves accent={accent} />
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "64px 72px 110px", flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <Mark size={52} />
            <span style={{ fontSize: 20, letterSpacing: 4, textTransform: "uppercase", color: MUTED }}>{eyebrow}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            <span
              style={{
                fontFamily: "Mona",
                fontSize: image ? (long ? 64 : 84) : long ? 88 : 112,
                lineHeight: 0.92,
                letterSpacing: -3,
                maxWidth: image ? 640 : 1000,
              }}
            >
              {title}
            </span>
            {lines.map((l) => (
              <span key={l} style={{ fontSize: 24, color: MUTED, maxWidth: image ? 620 : 900, lineHeight: 1.35 }}>
                {l}
              </span>
            ))}
          </div>
        </div>
        {image ? (
          <div style={{ display: "flex", alignItems: "center", paddingRight: 72, paddingBottom: 40 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image.src}
              alt=""
              width={image.phone ? 230 : 420}
              height={image.phone ? 470 : 300}
              style={{
                borderRadius: image.phone ? 34 : 14,
                border: image.phone ? "7px solid #101217" : `1px solid ${BONE}33`,
                boxShadow: `0 30px 80px ${accent}40`,
              }}
            />
          </div>
        ) : null}
      </div>
    ),
    { ...OG_SIZE, fonts: await fonts() },
  );
}
