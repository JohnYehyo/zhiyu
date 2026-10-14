import type { RichNode } from "../types";
import { isJournalAsset } from "../journal-assets";

/** Trim editor-only defaults at the write boundary, retaining verified media identities. */
export function serializeEditorDocument(value: RichNode): RichNode {
  const node: RichNode = { type: value.type };
  if (value.text !== undefined) node.text = value.text;
  if (value.content) node.content = value.content.map(serializeEditorDocument);
  const keys = ["image", "video"].includes(value.type)
    ? ["mediaId", "storageKey", "src", "alt", "caption", ...(value.type === "image" ? ["layout", "date"] : [])]
    : value.type === "blockquote"
      ? ["tone", "attribution"]
    : value.type === "heading"
      ? ["level"]
      : value.type === "orderedList"
        ? ["start"]
        : [];
  const attrs = Object.fromEntries(
    keys.flatMap((key) => {
      const attr = value.attrs?.[key];
      if (key === "src" && !attr) return [];
      if (key === "mediaId" && attr === "" && value.type === "image" && isJournalAsset(value.attrs?.storageKey)) return [];
      return attr !== null && attr !== undefined ? [[key, attr]] : [];
    }),
  );
  if (Object.keys(attrs).length) node.attrs = attrs;
  if (value.marks)
    node.marks = value.marks.map((mark) =>
      mark.type === "link"
        ? { type: mark.type, attrs: { href: mark.attrs?.href } }
        : { type: mark.type },
    );
  return node;
}

export function defaultSlug(
  date = new Date(),
  random = crypto.randomUUID().slice(0, 8),
): string {
  return `journal-${date.toISOString().slice(0, 10).replaceAll("-", "")}-${random}`;
}
