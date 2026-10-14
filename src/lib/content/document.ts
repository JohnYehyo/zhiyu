import type { RichNode } from "../types";
import { isJournalAsset, journalQuoteTones } from "../journal-assets";

const nodeTypes = new Set(["doc", "paragraph", "text", "heading", "blockquote", "bulletList", "orderedList", "listItem", "hardBreak", "horizontalRule", "image", "video", "codeBlock"]);
const markTypes = new Set(["bold", "italic", "underline", "strike", "code", "link"]);
const issuedImageKey = /^blob\/[\da-f-]{36}\/[\da-f-]{36}\.(jpg|png|webp|gif)$/i;
const mediaId = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;

export function safeLink(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const link = value.trim();
  if (!link || /[\u0000-\u0020\u007f\\]/.test(link)) return null;
  if (/^\/(?!\/)/.test(link) || /^#[A-Za-z0-9_-]+$/.test(link)) return link;
  try {
    const url = new URL(link);
    if (["https:", "http:", "mailto:"].includes(url.protocol) && !url.username && !url.password) return link;
  } catch { /* Invalid URLs are omitted. */ }
  return null;
}

/** Restrict untrusted JSON at the read boundary; never interpret HTML. */
export function normalizeDocument(input: unknown): RichNode {
  let nodes = 0;
  function normalize(value: unknown, depth: number): RichNode | null {
    if (!value || typeof value !== "object" || depth > 32 || ++nodes > 5000) return null;
    const source = value as Record<string, unknown>;
    if (typeof source.type !== "string" || !nodeTypes.has(source.type)) return null;
    const node: RichNode = { type: source.type };
    if (source.type === "text") {
      if (typeof source.text !== "string") return null;
      node.text = source.text;
      if (Array.isArray(source.marks)) {
        node.marks = source.marks.flatMap((value) => {
          if (!value || typeof value !== "object" || typeof value.type !== "string" || !markTypes.has(value.type)) return [];
          if (value.type === "link") {
            const href = safeLink(value.attrs?.href);
            return href ? [{ type: "link", attrs: { href } }] : [];
          }
          return [{ type: value.type }];
        });
      }
    }
    if (source.attrs && typeof source.attrs === "object") {
      const attrs = source.attrs as Record<string, unknown>;
      node.attrs = {};
      for (const key of ["mediaId", "storageKey", "alt", "caption", "src", "poster"]) {
        if (typeof attrs[key] === "string") node.attrs[key] = attrs[key];
      }
      if (source.type === "heading") node.attrs.level = Number.isInteger(attrs.level) && Number(attrs.level) >= 1 && Number(attrs.level) <= 6 ? attrs.level : 2;
      if (source.type === "orderedList") node.attrs.start = Number.isInteger(attrs.start) && Number(attrs.start) > 0 ? attrs.start : 1;
      if (source.type === "blockquote") {
        node.attrs = { tone: journalQuoteTones.some((tone) => tone === attrs.tone) ? attrs.tone : "pink" };
        if (typeof attrs.attribution === "string" && attrs.attribution.length <= 200) node.attrs.attribution = attrs.attribution;
      }
      if (source.type === "image") {
        if (!isJournalAsset(attrs.storageKey) && !(typeof attrs.storageKey === "string" && issuedImageKey.test(attrs.storageKey) && typeof attrs.mediaId === "string" && mediaId.test(attrs.mediaId))) return null;
        if (attrs.layout === "single" || attrs.layout === "pair") node.attrs.layout = attrs.layout;
        if (typeof attrs.date === "string" && attrs.date.length <= 40) node.attrs.date = attrs.date;
      }
    }
    if (source.type === "image" && !node.attrs) return null;
    if (Array.isArray(source.content)) node.content = source.content.flatMap((child) => {
      const normalized = normalize(child, depth + 1);
      return normalized ? [normalized] : [];
    });
    return node;
  }
  const normalized = normalize(input, 0);
  return normalized?.type === "doc" ? { ...normalized, content: normalized.content ?? [] } : { type: "doc", content: [] };
}

function textOf(node: RichNode): string {
  if (node.type === "text") return node.text ?? "";
  if (node.type === "hardBreak") return "\n";
  return (node.content ?? []).map(textOf).join(node.type === "doc" ? "\n" : "");
}

export function documentText(input: RichNode): string { return textOf(normalizeDocument(input)); }

export function documentHeadings(input: RichNode): { id: string; text: string }[] {
  const headings: { id: string; text: string }[] = [];
  function visit(node: RichNode) {
    if (node.type === "heading") headings.push({ id: `section-${headings.length + 1}`, text: textOf(node) });
    node.content?.forEach(visit);
  }
  visit(normalizeDocument(input));
  return headings;
}
