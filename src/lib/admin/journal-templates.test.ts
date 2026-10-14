import { expect, it } from "vitest";
import { getSchema } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { EditorImage } from "@/components/admin/media-node";
import { JournalStyle } from "@/components/admin/journal-style";
import { journalTemplate } from "./journal-templates";

it("creates an editable scrapbook page with a colored note and paired approved photos", () => {
  const first = journalTemplate("journal");
  const note = first.content?.find((node) => node.type === "blockquote");
  expect(note?.attrs).toMatchObject({
    tone: "pink",
    attribution: "记在今天的小日记里",
  });
  const photos = first.content?.filter((node) => node.type === "image") ?? [];
  expect(photos).toHaveLength(2);
  expect(photos.map((node) => node.attrs?.layout)).toEqual(["pair", "pair"]);
  expect(
    photos.every((node) =>
      String(node.attrs?.storageKey).startsWith("/assets/"),
    ),
  ).toBe(true);
  first.content!.splice(0, 1);
  expect(journalTemplate("journal").content?.[0].type).toBe("heading");
});

it("standalone additions never require a cloud upload or raw HTML", () => {
  expect(journalTemplate("note").content?.[0].type).toBe("blockquote");
  expect(
    journalTemplate("photos").content?.filter((n) => n.type === "image"),
  ).toHaveLength(2);
  expect(JSON.stringify(journalTemplate("journal"))).not.toMatch(
    /rawHTML|mediaId|style=/,
  );
});

it("all templates are accepted by the actual editor schema including empty trailing paragraphs", () => {
  const schema = getSchema([StarterKit, EditorImage, JournalStyle]);
  for (const kind of ["journal", "note", "photos"] as const) {
    const node = schema.nodeFromJSON(journalTemplate(kind));
    expect(node.type.name).toBe("doc");
    expect(node.check()).toBeUndefined();
  }
});
