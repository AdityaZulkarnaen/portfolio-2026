/** Small dot caption under a frame. */
export function Caption({ children }: { children: string }) {
  if (!children) return null;
  return (
    <figcaption className="mt-4 flex max-w-[48ch] items-baseline gap-2.5 text-sm leading-snug text-bone-400">
      <span className="size-1.5 flex-none -translate-y-px rounded-full bg-(--accent)" aria-hidden="true" />
      <span>{children}</span>
    </figcaption>
  );
}
