import { expect, it } from "vitest";
import { serializeEditorDocument, defaultSlug } from "./content";
import { validateDocument } from "../server/security";
import { getSchema } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { EditorImage } from "@/components/admin/media-node";

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

it("round trips quote and paired photo metadata through the strict write boundary", () => {
  const result = serializeEditorDocument({ type: "doc", content: [
    { type: "blockquote", attrs: { tone: "mint", attribution: "小记", style: "color:red" }, content: [{ type: "paragraph", content: [{ type: "text", text: "夏天" }] }] },
    { type: "image", attrs: { storageKey: "/assets/flowers.svg", mediaId: null, src: "", layout: "pair", date: "2026.10.14", caption: "花园", width: 500 } },
  ] });
  expect(result.content?.[0].attrs).toEqual({ tone: "mint", attribution: "小记" });
  expect(result.content?.[1].attrs).toEqual({ storageKey: "/assets/flowers.svg", layout: "pair", date: "2026.10.14", caption: "花园" });
  expect(validateDocument(result)).toEqual(result);
});

it("serializes builtin illustrations after actual EditorImage default attributes are applied", () => {
  const schema = getSchema([StarterKit, EditorImage]);
  const json = schema.nodeFromJSON({ type: "doc", content: [{ type: "image", attrs: { storageKey: "/assets/picnic.svg" } }] }).toJSON();
  expect(json.content[0].attrs.mediaId).toBe("");
  const result = serializeEditorDocument(json);
  expect(result.content?.[0].attrs).not.toHaveProperty("mediaId");
  expect(() => validateDocument(result)).not.toThrow();
});

it("does not discard nonempty builtin identities or missing cloud identities", () => {
  const serializeImage = (attrs: Record<string, unknown>) => serializeEditorDocument({ type: "doc", content: [{ type: "image", attrs }] });
  const builtin = serializeImage({ storageKey: "/assets/picnic.svg", mediaId: "11111111-1111-4111-8111-111111111111" });
  expect(builtin.content?.[0].attrs?.mediaId).toBe("11111111-1111-4111-8111-111111111111");
  expect(() => validateDocument(builtin)).toThrow();
  const cloud = serializeImage({ storageKey: "blob/11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222.jpg", mediaId: "" });
  expect(cloud.content?.[0].attrs?.mediaId).toBe("");
  expect(() => validateDocument(cloud)).toThrow();
});
