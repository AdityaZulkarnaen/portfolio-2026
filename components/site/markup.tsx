import { Fragment, type ReactNode } from "react";

import { parseInline, parseMarkup, type InlineNode } from "@/lib/content/markup";

function renderInline(nodes: InlineNode[], keyPrefix = ""): ReactNode[] {
  return nodes.map((node, i) => {
    const key = `${keyPrefix}${i}`;
    switch (node.type) {
      case "text":
        return <Fragment key={key}>{node.value}</Fragment>;
      case "break":
        return <br key={key} />;
      case "strong":
        return (
          <strong key={key} className="font-semibold text-bone-100">
            {renderInline(node.children, `${key}-`)}
          </strong>
        );
      case "highlight":
        return (
          <em key={key} className="hl">
            {renderInline(node.children, `${key}-`)}
          </em>
        );
      case "link": {
        const external = node.href.startsWith("http");
        return (
          <a
            key={key}
            href={node.href}
            className="link-underline"
            {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
          >
            {renderInline(node.children, `${key}-`)}
          </a>
        );
      }
    }
  });
}

/** Markup-lite → paragraphs. `*highlight*` becomes the serif italic in lilac. */
export function Markup({ source, className, paragraphClassName }: { source: string | null | undefined; className?: string; paragraphClassName?: string }) {
  const doc = parseMarkup(source);
  if (doc.length === 0) return null;
  return (
    <div className={className}>
      {doc.map((p, i) => (
        <p key={i} className={paragraphClassName}>
          {renderInline(p.children, `${i}-`)}
        </p>
      ))}
    </div>
  );
}

/** Single-line markup (no paragraph wrapper). */
export function InlineMarkup({ source }: { source: string }) {
  return <>{renderInline(parseInline(source))}</>;
}
