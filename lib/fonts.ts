import { Instrument_Serif, Mona_Sans, Plus_Jakarta_Sans } from "next/font/google";

/** Display + UI. Variable wght (200–900) plus the wdth axis (75–125). */
export const monaSans = Mona_Sans({
  subsets: ["latin"],
  axes: ["wdth"],
  display: "swap",
  variable: "--font-mona",
});

/** Slate labels and UI metadata. Variable wght (200–800). */
export const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jakarta",
});

/** Italic serif used only for `*highlight*` words. Not preloaded. */
export const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: "italic",
  display: "swap",
  preload: false,
  variable: "--font-instrument",
});

export const fontVariables = [
  monaSans.variable,
  plusJakarta.variable,
  instrumentSerif.variable,
].join(" ");
