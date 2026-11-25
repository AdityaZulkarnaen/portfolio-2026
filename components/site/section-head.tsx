import type { ReactNode } from "react";

import { SplitReveal } from "@/components/motion/split-reveal";
import { cn } from "@/lib/utils";

type Props = {
  id: string;
  title: ReactNode;
  lede?: ReactNode;
  children?: ReactNode;
  size?: "lg" | "md";
  className?: string;
};

/** Section heading row: big display title left (8 cols), lede + actions right (4 cols). */
export function SectionHead({ id, title, lede, children, size = "md", className }: Props) {
  return (
    <header
      className={cn(
        "grid gap-8 px-gutter md:grid-cols-12 md:items-end md:gap-x-[4vw]",
        size === "lg"
          ? "pt-[clamp(6rem,14vw,13rem)] pb-[clamp(3rem,7vw,6rem)]"
          : "pt-[clamp(5rem,11vw,10rem)] pb-[clamp(2rem,4vw,3.5rem)]",
        className,
      )}
    >
      <SplitReveal
        as="h2"
        id={id}
        type="lines"
        className={cn(
          "display md:col-span-8 [&_.hl]:text-[1.1em] [&_.hl]:leading-[0.8]",
          size === "lg" ? "text-[clamp(3rem,8.4vw,9.5rem)]" : "text-[clamp(2.6rem,6vw,6.5rem)]",
        )}
      >
        {title}
      </SplitReveal>
      <div className="grid content-end justify-items-start gap-6 md:col-span-4">
        {lede ? <p className="max-w-[44ch] text-[clamp(1rem,1.15vw,1.15rem)] leading-relaxed text-pretty text-bone-400">{lede}</p> : null}
        {children}
      </div>
    </header>
  );
}
