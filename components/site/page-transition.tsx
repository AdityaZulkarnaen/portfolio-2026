import { ViewTransition, type ReactNode } from "react";

const ENTER = { "to-case": "page-enter", "nav-forward": "page-enter", "nav-back": "page-enter-back", default: "none" };
const EXIT = { "to-case": "page-exit", "nav-forward": "page-exit", "nav-back": "page-exit", default: "none" };

/**
 * Page-level enter/exit view transition. Rendered from each page.tsx (layouts persist
 * across navigations, so enter/exit would never fire there).
 */
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <ViewTransition enter={ENTER} exit={EXIT} default="none">
      <div className="relative">{children}</div>
    </ViewTransition>
  );
}
