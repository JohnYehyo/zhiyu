import { describe, expect, it } from "vitest";
import { getSchema } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { EditorImage } from "@/components/admin/media-node";
import { capturePhotoTarget, verifyPhotoTarget } from "./photo-replacement";

const schema = getSchema([StarterKit, EditorImage]);
const photo = () => schema.nodes.image.create({ storageKey: "/assets/meadow.svg" });

describe("pending photo replacement", () => {
  it("accepts the original selected image and rejects videos", () => {
    const doc = schema.nodes.doc.create(null, [photo(), photo()]);
    const target = capturePhotoTarget(doc, 0)!;
    expect(verifyPhotoTarget(target, doc, "image")).toBe(doc.nodeAt(0));
    expect(() => verifyPhotoTarget(target, doc, "video")).toThrow("只能选择图片");
  });
  it("rejects a changed document even when another identical image occupies the old position", () => {
    const doc = schema.nodes.doc.create(null, [photo(), photo()]);
    const target = capturePhotoTarget(doc, 0)!;
    const changed = schema.nodes.doc.create(null, [doc.child(1)]);
    expect(() => verifyPhotoTarget(target, changed, "image")).toThrow("正文已修改");
    expect(changed.child(0)).toBe(doc.child(1));
  });
  it("captures the current selection even for two identical photos", () => {
    const doc = schema.nodes.doc.create(null, [photo(), photo()]);
    const first = capturePhotoTarget(doc, 0)!;
    const second = capturePhotoTarget(doc, doc.child(0).nodeSize)!;
    expect(first.position).not.toBe(second.position);
    expect(verifyPhotoTarget(second, doc, "image")).toBe(doc.child(1));
  });
  it("cannot capture a paragraph as a photo", () => {
    const doc = schema.nodes.doc.create(null, schema.nodes.paragraph.create());
    expect(capturePhotoTarget(doc, 0)).toBeNull();
  });
});
