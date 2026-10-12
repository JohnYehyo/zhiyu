import { z } from "zod";
import { safeLink } from "../content/document";
import type { PostDraft, RichNode } from "../types";
import { ServiceError } from "./errors";
const key = z
  .string()
  .regex(
    /^blob\/[\da-f-]{36}\/[\da-f-]{36}\.(jpg|png|webp|gif|mp4|webm|mov)$/i,
  );
const uuid = z.string().uuid();
const types = new Set([
  "doc",
  "paragraph",
  "text",
  "heading",
  "blockquote",
  "bulletList",
  "orderedList",
  "listItem",
  "hardBreak",
  "horizontalRule",
  "image",
  "video",
  "codeBlock",
]);
const blocks = new Set([
  "paragraph",
  "heading",
  "blockquote",
  "bulletList",
  "orderedList",
  "horizontalRule",
  "image",
  "video",
  "codeBlock",
]);
const marks = z
  .array(
    z.discriminatedUnion("type", [
      z
        .object({
          type: z.literal("link"),
          attrs: z
            .object({
              href: z
                .string()
                .max(2048)
                .refine((v) => Boolean(safeLink(v))),
            })
            .strict(),
        })
        .strict(),
      ...["bold", "italic", "underline", "strike", "code"].map((type) =>
        z.object({ type: z.literal(type) }).strict(),
      ),
    ]),
  )
  .max(10);
function invalid(): never {
  throw new ServiceError(400, "INVALID_BODY", "内容格式或长度不符合要求。");
}
export function validateDocument(input: unknown): RichNode {
  let count = 0;
  function visit(value: unknown, depth: number, parent?: string): RichNode {
    if (
      depth > 32 ||
      ++count > 5000 ||
      !value ||
      typeof value !== "object" ||
      Array.isArray(value)
    )
      invalid();
    const raw = value as Record<string, unknown>;
    if (
      typeof raw.type !== "string" ||
      !types.has(raw.type) ||
      Object.keys(raw).some(
        (k) => !["type", "text", "attrs", "marks", "content"].includes(k),
      )
    )
      invalid();
    const type = raw.type;
    if ((!parent && type !== "doc") || (parent && type === "doc")) invalid();
    if (
      parent &&
      ((["doc", "blockquote", "listItem"].includes(parent) &&
        !blocks.has(type)) ||
        (["paragraph", "heading"].includes(parent) &&
          !["text", "hardBreak"].includes(type)) ||
        (parent === "codeBlock" && type !== "text") ||
        (["bulletList", "orderedList"].includes(parent) && type !== "listItem"))
    )
      invalid();
    const node: RichNode = { type };
    if (type === "text") {
      if (
        typeof raw.text !== "string" ||
        raw.text.length > 100000 ||
        raw.content !== undefined ||
        raw.attrs !== undefined
      )
        invalid();
      node.text = raw.text;
      if (raw.marks !== undefined) {
        const result = marks.safeParse(raw.marks);
        if (!result.success) invalid();
        node.marks = result.data;
      }
    } else if (raw.text !== undefined || raw.marks !== undefined) invalid();
    if (raw.attrs !== undefined) {
      const attrSchema =
        type === "heading"
          ? z.object({ level: z.number().int().min(1).max(6) }).strict()
          : type === "orderedList"
            ? z
                .object({
                  start: z.number().int().min(1).max(10000).optional(),
                })
                .strict()
            : ["image", "video"].includes(type)
              ? z
                  .object({
                    mediaId: uuid,
                    storageKey: key,
                    alt: z.string().max(500).optional(),
                    caption: z.string().max(1000).optional(),
                    src: z
                      .string()
                      .max(2048)
                      .refine(
                        (v) => Boolean(safeLink(v)) || v.startsWith("blob:"),
                      )
                      .optional(),
                  })
                  .strict()
              : z.object({}).strict();
      const result = attrSchema.safeParse(raw.attrs);
      if (!result.success) invalid();
      node.attrs = result.data;
    } else if (["image", "video", "heading"].includes(type)) invalid();
    if (raw.content !== undefined) {
      if (
        !Array.isArray(raw.content) ||
        ["text", "image", "video", "horizontalRule", "hardBreak"].includes(type)
      )
        invalid();
      node.content = raw.content.map((v) => visit(v, depth + 1, type));
    } else if (
      !["text", "image", "video", "horizontalRule", "hardBreak"].includes(type)
    )
      node.content = [];
    return node;
  }
  return visit(input, 0);
}
const draftSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    slug: z
      .string()
      .min(1)
      .max(120)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    excerpt: z.string().max(1000),
    category: z.string().trim().min(1).max(60),
    coverKey: z.union([z.literal(""), key]),
    content: z.unknown(),
  })
  .strict();
export function validateDraft(input: unknown): PostDraft {
  const parsed = draftSchema.safeParse(input);
  if (!parsed.success) invalid();
  return { ...parsed.data, content: validateDocument(parsed.data.content) };
}
export function validateRevision(input: unknown): number {
  const parsed = z
    .object({ revision: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER) })
    .strict()
    .safeParse(input);
  if (!parsed.success) invalid();
  return parsed.data.revision;
}
export function validatePatch(input: unknown): {
  revision: number;
  draft: PostDraft;
} {
  const parsed = z
    .object({
      revision: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
      draft: z.unknown(),
    })
    .strict()
    .safeParse(input);
  if (!parsed.success) invalid();
  return {
    revision: parsed.data.revision,
    draft: validateDraft(parsed.data.draft),
  };
}
export function validateId(input: string): string {
  if (!uuid.safeParse(input).success)
    throw new ServiceError(400, "INVALID_ID", "稿件或媒体编号无效。");
  return input;
}
export function validateUpload(input: unknown): {
  filename: string;
  contentType: string;
  size: number;
} {
  const parsed = z
    .object({
      filename: z
        .string()
        .min(1)
        .max(200)
        .refine(
          (v) => !/[\\/\u0000-\u001f\u007f]/.test(v) && v !== "." && v !== "..",
        ),
      contentType: z.enum([
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",
        "video/mp4",
        "video/webm",
        "video/quicktime",
      ]),
      size: z.number().int().positive(),
    })
    .strict()
    .safeParse(input);
  if (
    !parsed.success ||
    parsed.data.size >
      (parsed.data.contentType.startsWith("image/") ? 20 : 200) * 1024 * 1024
  )
    invalid();
  return parsed.data;
}
export function assertOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin)
    throw new ServiceError(403, "CROSS_ORIGIN", "请从本站提交操作。");
}
export function verifyAdminIdentity(
  user: { id: string } | null,
  admin: string | undefined,
): { userId: string } {
  if (!user) throw new ServiceError(401, "UNAUTHENTICATED", "请先登录。");
  if (!admin || user.id !== admin)
    throw new ServiceError(403, "FORBIDDEN", "此账号没有管理权限。");
  return { userId: user.id };
}
