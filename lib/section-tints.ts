export const SECTION_TINTS = {
  clients: "#3352ff",
  about: "#c9502c",
  experience: "#5a9e66",
  achievements: "#c48a32",
  stack: "#8352c4",
  contact: "#ff5b2e",
} as const;

export type SectionTone = keyof typeof SECTION_TINTS;
