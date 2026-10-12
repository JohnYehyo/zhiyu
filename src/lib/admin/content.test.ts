import { expect, it } from "vitest";
import { serializeEditorDocument, defaultSlug } from "./content";
import { validateDocument } from "../server/security";

it("preserves media ownership while dropping Tiptap-only defaults for the strict API", () => {
  const result = serializeEditorDocument({
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "hello",
            marks: [
              {
                type: "link",
                attrs: {
                  href: "https://example.com",
                  target: "_blank",
                  rel: "noopener",
                  class: null,
                },
              },
            ],
          },
        ],
      },
      {
        type: "codeBlock",
        attrs: { language: null },
        content: [{ type: "text", text: "code" }],
      },
      {
        type: "image",
        attrs: {
          mediaId: "11111111-1111-4111-8111-111111111111",
          storageKey:
            "blob/11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222.jpg",
          src: "https://example.com/a.jpg",
          alt: "照片",
          caption: "图注",
          title: null,
          width: null,
          height: null,
        },
      },
    ],
  });
  expect(result.content?.[2].attrs).toEqual({
    mediaId: "11111111-1111-4111-8111-111111111111",
    storageKey:
      "blob/11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222.jpg",
    src: "https://example.com/a.jpg",
    alt: "照片",
    caption: "图注",
  });
  expect(() => validateDocument(result)).not.toThrow();
  expect(result.content?.[0].content?.[0].marks?.[0]).toEqual({
    type: "link",
    attrs: { href: "https://example.com" },
  });
});

it("generates valid ASCII slugs for Chinese titles without user translation", () => {
  expect(defaultSlug(new Date("2026-10-12T08:00:00Z"), "ab1234")).toBe(
    "journal-20261012-ab1234",
  );
});

it("omits empty editor preview src when reopening media without a preview URL", () => {
  const result = serializeEditorDocument({
    type: "doc",
    content: [
      {
        type: "image",
        attrs: {
          mediaId: "11111111-1111-4111-8111-111111111111",
          storageKey:
            "blob/11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222.jpg",
          src: "",
          alt: "",
          caption: "",
        },
      },
    ],
  });
  expect(() => validateDocument(result)).not.toThrow();
  expect(result.content?.[0].attrs).not.toHaveProperty("src");
});
