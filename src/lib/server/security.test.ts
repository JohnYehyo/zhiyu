import { describe, expect, it, vi, afterEach } from "vitest";
import { hasSupabaseConfig, hasWriteConfig } from "../config";
import {
  validateDraft,
  validateUpload,
  validateRevision,
  assertOrigin,
  verifyAdminIdentity,
  validateDocument,
} from "./security";
const draft = {
  title: "Title",
  slug: "hello-world",
  excerpt: "Short",
  category: "日记",
  coverKey: "",
  content: {
    type: "doc",
    content: [
      { type: "paragraph", content: [{ type: "text", text: "hello" }] },
    ],
  },
};
afterEach(() => vi.unstubAllEnvs());
describe("write boundary rejects unsafe or unauthorized input", () => {
  it("public URL without key cannot enable reader/auth or writes", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
    expect(hasSupabaseConfig()).toBe(false);
    expect(hasWriteConfig()).toBe(false);
  });
  it("text writes do not depend on R2 credentials", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "public");
    vi.stubEnv("SUPABASE_SECRET_KEY", "secret");
    vi.stubEnv("ADMIN_USER_ID", "11111111-1111-4111-8111-111111111111");
    vi.stubEnv("R2_SECRET_ACCESS_KEY", "");
    expect(hasWriteConfig()).toBe(true);
  });
  it("rejects nonadmin and unauthenticated identities", () => {
    expect(() => verifyAdminIdentity(null, "admin")).toThrow(/登录/);
    expect(() => verifyAdminIdentity({ id: "other" }, "admin")).toThrow(/权限/);
    expect(verifyAdminIdentity({ id: "admin" }, "admin")).toEqual({
      userId: "admin",
    });
  });
  it("requires exact Origin on cookie mutations, rejects missing and cross origin", () => {
    expect(() =>
      assertOrigin(new Request("https://site.test/api/admin/posts")),
    ).toThrow();
    expect(() =>
      assertOrigin(
        new Request("https://site.test/api/admin/posts", {
          headers: { origin: "https://evil.test" },
        }),
      ),
    ).toThrow();
    expect(() =>
      assertOrigin(
        new Request("https://site.test/api/admin/posts", {
          headers: { origin: "https://site.test" },
        }),
      ),
    ).not.toThrow();
  });
  it("accepts bounded text-only draft and rejects invalid slug/extra fields", () => {
    expect(validateDraft(draft)).toEqual(draft);
    expect(() => validateDraft({ ...draft, slug: "../../x" })).toThrow();
    expect(() => validateDraft({ ...draft, owner_id: "other" })).toThrow();
  });
  it.each(["html", "script"])(
    "rejects unsupported %s nodes rather than silently losing content",
    (type) => {
      expect(() =>
        validateDraft({
          ...draft,
          content: { type: "doc", content: [{ type, text: "x" }] },
        }),
      ).toThrow();
    },
  );
  it("rejects dangerous links and structural abuse", () => {
    expect(() =>
      validateDraft({
        ...draft,
        content: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "x",
                  marks: [
                    { type: "link", attrs: { href: "javascript:alert(1)" } },
                  ],
                },
              ],
            },
          ],
        },
      }),
    ).toThrow();
    expect(() =>
      validateDraft({
        ...draft,
        content: { type: "doc", content: [{ type: "text", text: "x" }] },
      }),
    ).toThrow();
  });
  it("requires media identity and issued storage key; rejects arbitrary src", () => {
    expect(() =>
      validateDraft({
        ...draft,
        content: {
          type: "doc",
          content: [{ type: "image", attrs: { src: "https://evil.test/a" } }],
        },
      }),
    ).toThrow();
    expect(() =>
      validateDraft({ ...draft, coverKey: "/assets/demo.svg" }),
    ).toThrow();
  });
  it("limits nesting and body size", () => {
    let content: unknown = { type: "paragraph", content: [] };
    for (let i = 0; i < 40; i++)
      content = { type: "blockquote", content: [content] };
    expect(() =>
      validateDraft({ ...draft, content: { type: "doc", content: [content] } }),
    ).toThrow();
    expect(() => validateDraft({ ...draft, title: "x".repeat(201) })).toThrow();
  });
  it("rejects negative/noninteger revisions", () => {
    expect(() => validateRevision({ revision: -1 })).toThrow();
    expect(() => validateRevision({ revision: 1.1 })).toThrow();
    expect(validateRevision({ revision: 2 })).toBe(2);
  });
  it("permits only bounded raster/video uploads and never paths or SVG", () => {
    expect(
      validateUpload({
        filename: "photo.jpg",
        contentType: "image/jpeg",
        size: 100,
      }),
    ).toEqual({ filename: "photo.jpg", contentType: "image/jpeg", size: 100 });
    for (const input of [
      { filename: "../x.jpg", contentType: "image/jpeg", size: 10 },
      { filename: "x.svg", contentType: "image/svg+xml", size: 10 },
      { filename: "x.jpg", contentType: "image/jpeg", size: 0 },
      { filename: "x.jpg", contentType: "image/jpeg", size: 21 * 1024 * 1024 },
      { filename: "x.mp4", contentType: "video/mp4", size: 201 * 1024 * 1024 },
    ])
      expect(() => validateUpload(input)).toThrow();
  });
});

describe("journal content contracts", () => {
  it.each(["picnic", "meadow", "flowers", "sea", "window", "sun"])("allows the approved %s illustration without a media record", (name) => {
    const storageKey = `/assets/${name}.svg`;
    const content = { type: "doc", content: [{ type: "image", attrs: { storageKey, layout: "pair", date: "2026.10.14", caption: "下午" } }] };
    expect(validateDraft({ ...draft, coverKey: storageKey, content }).content).toEqual(content);
  });
  it.each(["/assets/demo.svg", "/assets/picnic.svg?x", "/assets/../picnic.svg", "blob/unverified.png"])("rejects an unissued image or cover %s", (storageKey) => {
    expect(() => validateDraft({ ...draft, coverKey: storageKey })).toThrow();
    expect(() => validateDocument({ type: "doc", content: [{ type: "image", attrs: { storageKey } }] })).toThrow();
  });
  it("keeps cloud images dependent on a media ID and excludes builtin video", () => {
    const storageKey = "blob/11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222.jpg";
    expect(() => validateDocument({ type: "doc", content: [{ type: "image", attrs: { storageKey } }] })).toThrow();
    expect(() => validateDocument({ type: "doc", content: [{ type: "video", attrs: { storageKey: "/assets/picnic.svg" } }] })).toThrow();
  });
  it("preserves bounded quote styles and rejects CSS or oversized metadata", () => {
    const quote = (attrs: object) => ({ type: "doc", content: [{ type: "blockquote", attrs, content: [{ type: "paragraph", content: [{ type: "text", text: "记住这一刻" }] }] }] });
    for (const tone of ["pink", "blue", "green", "yellow", "peach", "mint"]) expect(validateDocument(quote({ tone, attribution: "芝语" })).content?.[0].attrs).toEqual({ tone, attribution: "芝语" });
    expect(validateDocument(quote({ attribution: "芝语" })).content?.[0].attrs).toEqual({ tone: "pink", attribution: "芝语" });
    for (const attrs of [{ tone: "red" }, { style: "color:red" }, { attribution: "x".repeat(201) }]) expect(() => validateDocument(quote(attrs))).toThrow();
    for (const attrs of [{ layout: "grid" }, { date: "x".repeat(41) }, { style: "width:100%" }]) expect(() => validateDocument({ type: "doc", content: [{ type: "image", attrs: { storageKey: "/assets/picnic.svg", ...attrs } }] })).toThrow();
  });
});
