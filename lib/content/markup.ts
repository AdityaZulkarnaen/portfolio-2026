/**
 * Markup-lite parser → token tree (never HTML strings).
 *
 *   blank line        → new paragraph
 *   single newline    → line break
 *   **bold**          → strong
 *   *highlight*       → highlight (rendered in the serif italic)
 *   [text](https://…) → link (http(s) and mailto only)
 *   backslash + one of \ * [ ] ( )  → that literal character
 */

export type InlineNode =
  | { type: "text"; value: string }
  | { type: "break" }
  | { type: "strong"; children: InlineNode[] }
  | { type: "highlight"; children: InlineNode[] }
  | { type: "link"; href: string; children: InlineNode[] };

export type ParagraphNode = { type: "paragraph"; children: InlineNode[] };

export type MarkupDocument = ParagraphNode[];

const LINK_RE = /^\[([^\]\n]+)\]\(((?:https?:\/\/|mailto:)[^\s()]+)\)/i;
const ESCAPABLE = /[\\*[\]()]/;

function pushText(nodes: InlineNode[], value: string) {
  if (!value) return;
  const last = nodes[nodes.length - 1];
  if (last && last.type === "text") last.value += value;
  else nodes.push({ type: "text", value });
}

/** Index of the closing single `*` (not part of `**`, not escaped), or -1. */
function findSingleStar(src: string, from: number): number {
  for (let j = from; j < src.length; j++) {
    const ch = src[j];
    if (ch === "\\") {
      j++;
      continue;
    }
    if (ch !== "*") continue;
    if (src[j + 1] === "*") {
      // Skip over a nested **bold** run entirely.
      const close = findDoubleStar(src, j + 2);
      if (close === -1) return -1;
      j = close + 1;
      continue;
    }
    return j;
  }
  return -1;
}

/** Index of the closing `**` (not escaped), or -1. */
function findDoubleStar(src: string, from: number): number {
  for (let j = from; j < src.length - 1; j++) {
    if (src[j] === "\\") {
      j++;
      continue;
    }
    if (src[j] === "*" && src[j + 1] === "*") {
      // `***` closes a nested highlight first: `**bold *x***` → strong("bold ", highlight("x")).
      return src[j + 2] === "*" ? j + 1 : j;
    }
  }
  return -1;
}

export function parseInline(src: string): InlineNode[] {
  const nodes: InlineNode[] = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];

    if (ch === "\\" && i + 1 < src.length && ESCAPABLE.test(src[i + 1])) {
      pushText(nodes, src[i + 1]);
      i += 2;
      continue;
    }

    if (ch === "\n") {
      nodes.push({ type: "break" });
      i += 1;
      continue;
    }

    if (ch === "*" && src[i + 1] === "*") {
      const close = findDoubleStar(src, i + 2);
      if (close > i + 2) {
        nodes.push({ type: "strong", children: parseInline(src.slice(i + 2, close)) });
        i = close + 2;
        continue;
      }
    } else if (ch === "*") {
      const close = findSingleStar(src, i + 1);
      if (close > i + 1) {
        nodes.push({ type: "highlight", children: parseInline(src.slice(i + 1, close)) });
        i = close + 1;
        continue;
      }
    } else if (ch === "[") {
      const match = LINK_RE.exec(src.slice(i));
      if (match) {
        nodes.push({ type: "link", href: match[2], children: parseInline(match[1]) });
        i += match[0].length;
        continue;
      }
    }

    pushText(nodes, ch);
    i += 1;
  }
  return nodes;
}

export function parseMarkup(src: string | null | undefined): MarkupDocument {
  if (!src) return [];
  return src
    .replace(/\r\n?/g, "\n")
    .split(/\n[ \t]*\n+/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => ({ type: "paragraph" as const, children: parseInline(block) }));
}

function inlineToText(nodes: InlineNode[]): string {
  return nodes
    .map((node) => {
      switch (node.type) {
        case "text":
          return node.value;
        case "break":
          return " ";
        default:
          return inlineToText(node.children);
      }
    })
    .join("");
}

/** Plain text for meta descriptions, aria-labels, etc. */
export function markupToPlainText(src: string | null | undefined): string {
  return parseMarkup(src)
    .map((p) => inlineToText(p.children))
    .join("\n\n");
}
