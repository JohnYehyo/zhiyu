import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { safeLink, normalizeDocument, documentText } from "./document";
import { mediaUrl } from "../media";
import { RichContent } from "@/components/rich-content";

afterEach(() => vi.unstubAllEnvs());

describe("public content safety", () => {
  it("keeps bounded journal metadata and discards unsupported image sources", () => {
    const doc = normalizeDocument({ type: "doc", content: [
      { type: "blockquote", attrs: { tone: "blue", attribution: "芝语", style: "color:red" }, content: [] },
      { type: "blockquote", attrs: { tone: "evil", attribution: "x".repeat(201) }, content: [] },
      { type: "image", attrs: { storageKey: "/assets/flowers.svg", layout: "pair", date: "夏日", caption: "花" } },
      { type: "image", attrs: { storageKey: "/assets/unapproved.svg" } },
      { type: "image", attrs: { storageKey: "blob/unverified.png" } },
    ] });
    expect(doc.content).toHaveLength(3);
    expect(doc.content?.[0].attrs).toEqual({ tone: "blue", attribution: "芝语" });
    expect(doc.content?.[1].attrs).toEqual({ tone: "pink" });
    expect(doc.content?.[2].attrs).toEqual({ storageKey: "/assets/flowers.svg", layout: "pair", date: "夏日", caption: "花" });
  });
  it("requires issued identity for cloud images and drops malformed photo metadata", () => {
    const storageKey = "blob/11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222.jpg";
    const doc = normalizeDocument({ type: "doc", content: [
      { type: "image", attrs: { storageKey } },
      { type: "image", attrs: { storageKey, mediaId: "unverified" } },
      { type: "image", attrs: { storageKey, mediaId: "22222222-2222-4222-8222-222222222222", layout: "grid", date: "x".repeat(41), style: "color:red" } },
    ] });
    expect(doc.content).toEqual([{ type: "image", attrs: { storageKey, mediaId: "22222222-2222-4222-8222-222222222222" } }]);
  });
  it.each(["javascript:alert(1)", "JAVASCRIPT:alert(1)", "java\nscript:alert(1)", "data:text/html,test", "//evil.test", "\\evil.test", "file:///tmp/key"])("rejects unsafe link %s", (url) => {
    expect(safeLink(url)).toBeNull();
  });
  it("keeps conventional links and local reading paths", () => {
    expect(safeLink("https://example.com/story")).toBe("https://example.com/story");
    expect(safeLink("/posts/a-memory")).toBe("/posts/a-memory");
    expect(safeLink("mailto:hello@example.com")).toBe("mailto:hello@example.com");
  });
  it("discards unknown nodes and raw HTML instead of rendering their children", () => {
    const document = normalizeDocument({ type: "doc", content: [
      { type: "rawHTML", attrs: { html: "<script>alert(1)</script>" }, content: [{ type: "text", text: "hidden" }] },
      { type: "unknown", content: [{ type: "text", text: "also hidden" }] },
      { type: "paragraph", content: [{ type: "text", text: "safe" }] },
    ] });
    expect(documentText(document)).toBe("safe");
    expect(renderToStaticMarkup(<RichContent document={document} />)).not.toMatch(/script|hidden/);
  });
  it("escapes text while preserving supported paragraph, emphasis and safe links", () => {
    const html = renderToStaticMarkup(<RichContent document={{ type: "doc", content: [{ type: "paragraph", content: [
      { type: "text", text: "<script>text</script>", marks: [{ type: "bold" }] },
      { type: "text", text: "read", marks: [{ type: "link", attrs: { href: "https://example.com" } }] },
      { type: "text", text: "unsafe", marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }] },
    ] }] }} />);
    expect(html).toContain("<strong>&lt;script&gt;text&lt;/script&gt;</strong>");
    expect(html).toContain('href="https://example.com"');
    expect(html).not.toContain("javascript:");
    expect(html).toContain("unsafe");
  });
  it("omits missing and unsafe media, uses controls and captions for valid media", () => {
    const html = renderToStaticMarkup(<RichContent document={{ type: "doc", content: [
      { type: "image" }, { type: "image", attrs: { src: "https://evil.test/image.png" } },
      { type: "image", attrs: { storageKey: "/assets/flowers.svg", caption: "flowers" } },
      { type: "video", attrs: { storageKey: "/assets/afternoon.mp4", caption: "afternoon" } },
    ] }} />);
    expect(html.match(/<img /g)).toHaveLength(1);
    expect(html).toContain('alt=""');
    expect(html).toContain("<figcaption>flowers</figcaption>");
    expect(html).toContain("controls=\"\"");
    expect(html).toContain("playsInline=\"\"");
    expect(html).not.toMatch(/autoPlay|evil\.test/);
  });
  it("normalizes missing or malformed documents to an empty document", () => {
    expect(normalizeDocument(undefined)).toEqual({ type: "doc", content: [] });
    expect(normalizeDocument({ type: "doc", content: "bad" })).toEqual({ type: "doc", content: [] });
  });
});

describe("public media paths", () => {
  it("reads local example assets without using the cloud origin", () => {
    vi.stubEnv("NEXT_PUBLIC_MEDIA_BASE_URL", "https://media.example");
    expect(mediaUrl("/assets/picnic.svg")).toBe("/assets/picnic.svg");
  });
  it("preserves the blob prefix once and safely encodes object segments", () => {
    vi.stubEnv("NEXT_PUBLIC_MEDIA_BASE_URL", "https://media.example/");
    expect(mediaUrl("blob/admin/小花 1.png")).toBe("https://media.example/blob/admin/%E5%B0%8F%E8%8A%B1%201.png");
  });
  it.each(["other/image.png", "blob/../secret", "blob/%2e%2e/secret", "blob//image", "/assets/../secret", "javascript:alert(1)", "https://evil.test/image"])("rejects invalid media key %s", (key) => {
    vi.stubEnv("NEXT_PUBLIC_MEDIA_BASE_URL", "https://media.example");
    expect(mediaUrl(key)).toBe("");
  });
  it("fails closed when a cloud origin is absent or invalid", () => {
    vi.stubEnv("NEXT_PUBLIC_MEDIA_BASE_URL", "");
    expect(mediaUrl("blob/image.png")).toBe("");
    vi.stubEnv("NEXT_PUBLIC_MEDIA_BASE_URL", "javascript:alert(1)");
    expect(mediaUrl("blob/image.png")).toBe("");
  });
});
