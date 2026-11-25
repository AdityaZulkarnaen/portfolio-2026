import Link from "next/link";

/** Guardrail: public pages must be fully static (no cookies/headers/uncached IO). */
export const ensureStatic = "navigation";

const nav = [
  { href: "/work", label: "Work" },
  { href: "/#about", label: "About" },
  { href: "/#contact", label: "Contact" },
] as const;

export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <header className="fixed inset-x-0 top-0 z-50 flex items-center justify-between px-6 py-5 md:px-10">
        <Link href="/" className="slate text-bone-100">
          Aditya Z
        </Link>
        <nav aria-label="Primary">
          <ul className="flex gap-6">
            {nav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="slate text-bone-400 transition-colors duration-(--dur-fast) hover:text-bone-100"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <main id="main">{children}</main>
      <footer className="border-t border-white/10 px-6 py-10 md:px-10">
        <p className="slate text-bone-400">Aditya Zulkarnaen · Yogyakarta</p>
      </footer>
    </>
  );
}
