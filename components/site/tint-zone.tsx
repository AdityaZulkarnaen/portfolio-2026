import type { CSSProperties, ReactNode } from "react";

import { StageTint } from "@/components/runtime/stage-tint";
import { SECTION_TINTS, type SectionTone } from "@/lib/section-tints";

export function TintZone({ tone, children }: { tone: SectionTone; children: ReactNode }) {
  const hex = SECTION_TINTS[tone];
  return (
    <div data-tint={tone} style={{ "--tint": hex } as CSSProperties}>
      <StageTint accent={hex} />
      {children}
    </div>
  );
}
