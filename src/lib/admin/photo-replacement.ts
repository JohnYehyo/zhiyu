import type { Node } from "@tiptap/pm/model";

export type PhotoTarget = { position: number; document: Node };

export function capturePhotoTarget(document: Node, position: number): PhotoTarget | null {
  return document.nodeAt(position)?.type.name === "image"
    ? { position, document }
    : null;
}

export function verifyPhotoTarget(target: PhotoTarget, document: Node, kind: string): Node {
  if (kind !== "image") throw new Error("替换照片只能选择图片。");
  const node = document.nodeAt(target.position);
  // A pending upload must not overwrite a different selection after edits or moves.
  if (target.document !== document || node?.type.name !== "image")
    throw new Error("正文已修改，照片没有被替换。已上传图片保留在素材库，请重新选择要替换的照片。");
  return node;
}
