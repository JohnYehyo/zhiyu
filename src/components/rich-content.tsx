import type { RichNode } from "@/lib/types";
import { createElement, type ReactNode } from "react";
import { normalizeDocument, safeLink } from "@/lib/content/document";
import { mediaUrl } from "@/lib/media";

export function RichContent({ document }: { document: RichNode }) {
  let heading = 0;
  function render(node: RichNode, key: number): ReactNode {
    const children = node.content?.map(render);
    const attrs = node.attrs ?? {};
    switch (node.type) {
      case "doc": return <div key={key} className="prose">{children}</div>;
      case "text": {
        let text: ReactNode = node.text;
        for (const mark of node.marks ?? []) {
          const element = { bold: "strong", italic: "em", underline: "u", strike: "s", code: "code" }[mark.type];
          if (element) text = createElement(element, {}, text);
          if (mark.type === "link") {
            const href = safeLink(mark.attrs?.href);
            if (href) text = <a href={href} rel="noopener noreferrer">{text}</a>;
          }
        }
        return <span key={key}>{text}</span>;
      }
      case "paragraph": return <p key={key}>{children}</p>;
      case "heading": return createElement(`h${attrs.level ?? 2}`, { key, id: `section-${++heading}` }, children);
      case "blockquote": return <blockquote key={key}>{children}</blockquote>;
      case "bulletList": return <ul key={key}>{children}</ul>;
      case "orderedList": return <ol key={key} start={Number(attrs.start) || 1}>{children}</ol>;
      case "listItem": return <li key={key}>{children}</li>;
      case "hardBreak": return <br key={key} />;
      case "horizontalRule": return <hr key={key} />;
      case "codeBlock": return <pre key={key}><code>{children}</code></pre>;
      case "image":
      case "video": {
        const src = mediaUrl(typeof attrs.storageKey === "string" ? attrs.storageKey : "");
        if (!src) return null;
        const caption = typeof attrs.caption === "string" ? attrs.caption : "";
        const alt = typeof attrs.alt === "string" ? attrs.alt : "";
        const poster = typeof attrs.poster === "string" ? mediaUrl(attrs.poster) : "";
        return <figure key={key} className={node.type === "image" ? "content-image" : "content-video"}>
          {node.type === "image" ? <img src={src} alt={alt} loading="lazy" /> : <video src={src} poster={poster || undefined} controls playsInline preload="metadata" aria-label={alt || caption || "日记视频"} />}
          {caption && <figcaption>{caption}</figcaption>}
        </figure>;
      }
      default: return null;
    }
  }
  return render(normalizeDocument(document), 0);
}
